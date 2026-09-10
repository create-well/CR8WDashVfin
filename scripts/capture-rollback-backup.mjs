#!/usr/bin/env node
/**
 * Captures a verified rollback backup of the production Notion mirror.
 *
 * Reads the seven CR8W mirror/metadata keys from Supabase with the service
 * role key from .env.production (never printed), wraps them in the
 * rollback-gate snapshot schema, writes backups/ plus manifest.json under
 * .backups/<generationId>/, then exits. Run the gate afterwards:
 *
 *   node scripts/capture-rollback-backup.mjs
 *   pnpm --silent verify:backup --root .backups/<generationId>
 *
 * The backup contains restricted sources (money, engineeringDelivery).
 * .backups/ is gitignored; never commit or share the output.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const TABLE = 'kv_store_8dcd9693';
const MIRROR_PREFIX = 'cr8w_notion_mirror_';
const META_KEY = 'cr8w_notion_sync_meta';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function loadEnv(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    fail(`missing env file: ${path}`);
  }
  const env = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function unwrap(raw) {
  // Sequential writer stores JSON.stringify(payload) as a jsonb string
  // scalar; the atomic RPC stores native jsonb. Accept both.
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw;
}

// --from-json <path> reads rows ([{key, value}]) from a local file instead of
// the REST API. Used when the service role key is unavailable locally and the
// rows were exported through another trusted channel (e.g. SQL read). The
// caller is responsible for the file's provenance; keep it gitignored.
const fromJsonIndex = process.argv.indexOf('--from-json');
const fromJsonPath = fromJsonIndex === -1 ? null : process.argv[fromJsonIndex + 1];
if (fromJsonIndex !== -1 && !fromJsonPath) fail('--from-json requires a file path');

const capturedAt = new Date().toISOString();
const generationId = `backup-${capturedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;

const keys = ['people', 'flows', 'moves', 'content', 'money', 'engineeringDelivery'].map(source => `${MIRROR_PREFIX}${source}`);
keys.push(META_KEY);

let rows;
if (fromJsonPath) {
  rows = JSON.parse(await readFile(resolve(fromJsonPath), 'utf8'));
  if (!Array.isArray(rows)) fail('rows file must be a JSON array of {key, value} objects');
} else {
  const env = await loadEnv(resolve('.env.production'));
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!url || !key) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.production');
  if (!url.includes('axntibrdivccycxdwlzk')) fail(`refusing to back up an unexpected project: ${url}`);

  const query = keys.map(item => `"${item}"`).join(',');
  const response = await fetch(`${url}/rest/v1/${TABLE}?select=key,value&key=in.(${encodeURIComponent(query)})`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) fail(`Supabase read failed with status ${response.status}`);
  rows = await response.json();
}

const values = new Map(rows.map(row => [row.key, row.value]));
for (const item of keys) {
  if (!values.has(item)) fail(`production key is missing: ${item}`);
}

const root = resolve('.backups', generationId);
const backupsDir = resolve(root, 'backups');
await mkdir(backupsDir, { recursive: true });

const meta = unwrap(values.get(META_KEY));
if (!meta || meta.source !== 'notion' || typeof meta.counts !== 'object' || !meta.counts) {
  fail('production sync metadata is missing or malformed');
}

const entries = [];
async function writeEntry({ backupId, key: mirrorKey, file, payload }) {
  const text = JSON.stringify(payload, null, 2);
  const buffer = Buffer.from(text, 'utf8');
  await writeFile(resolve(root, file), buffer);
  entries.push({
    backupId,
    key: mirrorKey,
    path: file,
    present: true,
    byteLength: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    capturedAt,
  });
}

const countedSources = Object.keys(meta.counts).sort();
for (const source of countedSources) {
  const mirrorKey = `${MIRROR_PREFIX}${source}`;
  if (!values.has(mirrorKey)) fail(`metadata counts ${source} but production has no ${mirrorKey}`);
  const records = unwrap(values.get(mirrorKey));
  if (!Array.isArray(records)) fail(`${mirrorKey} is not a record array`);
  if (meta.counts[source] !== records.length) {
    fail(`count drift for ${source}: metadata says ${meta.counts[source]}, mirror holds ${records.length}`);
  }
  await writeEntry({
    backupId: `${source}-snapshot`,
    key: mirrorKey,
    file: `backups/${source}.json`,
    payload: { source, generationId, capturedAt, records },
  });
}

await writeEntry({
  backupId: 'sync-meta',
  key: META_KEY,
  file: 'backups/sync-meta.json',
  payload: { ...meta, generationId },
});

const manifest = {
  version: 1,
  generationId,
  attemptedWriteKeys: entries.map(entry => entry.key).sort(),
  entries,
};
await writeFile(resolve(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`captured ${entries.length} keys into ${root}`);
console.log(`verify with: pnpm --silent verify:backup --root ${root}`);
