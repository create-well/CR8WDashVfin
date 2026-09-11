#!/usr/bin/env node
// Read-only drift and schema audit for the Notion -> Supabase mirror.
//
//   node scripts/audit-notion-sources.mjs
//
// Checks, per enabled source in api/notion-sources.ts:
//   1. Registry displayFields that do not exist in the live Notion schema.
//   2. Live Notion property types the v2 normalizer does not cover
//      (keep SUPPORTED_TYPES in sync with api/notion-property-envelope.ts).
//   3. Record-count drift: live Notion count vs Supabase mirror count.
// Plus environment presence (never values) for the sync variables.
//
// Exit code 0 = clean, 1 = findings. Writes nothing. Read-only against both
// Notion (data source query) and Supabase (REST SELECT).

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundleTs, loadLocalEnv, REPO_ROOT } from './notion-operator-lib.mjs';

// Must match the switch in api/notion-property-envelope.ts.
const SUPPORTED_TYPES = new Set([
  'title', 'rich_text', 'number', 'checkbox', 'select', 'status', 'multi_select',
  'date', 'people', 'relation', 'url', 'email', 'phone_number',
  'created_time', 'last_edited_time', 'unique_id',
  'formula', 'rollup', 'created_by', 'last_edited_by',
]);

loadLocalEnv();

const requiredEnv = ['NOTION_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Set them in the environment or in .env.local.');
  process.exit(2);
}

const registry = loadRegistry();
const findings = [];

const mirrorCounts = await readMirrorCounts();
for (const [key, config] of Object.entries(registry)) {
  if (!config.enabled) continue;
  const schema = await notionGet(`/data_sources/${config.dataSourceId}`);
  if (!schema.ok) {
    findings.push(`${key}: cannot fetch data source schema: ${schema.error}`);
    continue;
  }
  const propNames = Object.keys(schema.json.properties ?? {});
  const propTypes = Object.fromEntries(Object.entries(schema.json.properties ?? {}).map(([n, p]) => [n, p.type]));

  const missing = config.displayFields.filter((field) => !propNames.includes(field));
  if (missing.length) {
    findings.push(`${key}: displayFields not in live schema: ${missing.join(', ')} (live properties: ${propNames.join(', ')})`);
  }

  const unsupported = [...new Set(Object.values(propTypes))].filter((type) => !SUPPORTED_TYPES.has(type));
  if (unsupported.length) {
    findings.push(`${key}: property types outside v2 normalizer coverage: ${unsupported.join(', ')}`);
  }

  const liveCount = await countRecords(config.dataSourceId);
  const mirrorCount = mirrorCounts[key];
  if (liveCount === null) {
    findings.push(`${key}: live record count unavailable (query failed)`);
  } else if (mirrorCount === undefined) {
    findings.push(`${key}: no mirror row found in kv_store_8dcd9693`);
  } else if (liveCount !== mirrorCount) {
    findings.push(`${key}: DRIFT live=${liveCount} mirror=${mirrorCount}`);
  }
  console.log(`${key}: live=${liveCount ?? '?'} mirror=${mirrorCount ?? '?'} properties=${propNames.length}`);
}

console.log('');
if (findings.length) {
  console.log(`AUDIT: ${findings.length} finding(s)`);
  for (const finding of findings) console.log(`  - ${finding}`);
  process.exit(1);
}
console.log('AUDIT: clean (schema, types, counts, displayFields)');

function loadRegistry() {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'cr8w-audit-'));
  const bundlePath = path.join(tmpDir, 'registry-dump.cjs');
  const entry = `
  const { NOTION_SOURCES } = require(${JSON.stringify(path.join(REPO_ROOT, 'api', 'notion-sources.js'))});
  console.log(JSON.stringify(NOTION_SOURCES));
  `;
  try {
    bundleTs(entry, bundlePath);
    const run = spawnSync(process.execPath, [bundlePath], { encoding: 'utf8' });
    if (run.status !== 0) throw new Error(run.stderr || 'registry bundle failed');
    return JSON.parse(run.stdout.trim());
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function notionGet(pathname) {
  const res = await fetch(`https://api.notion.com/v1${pathname}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2025-09-03' },
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, json } : { ok: false, error: `${res.status} ${json.code ?? ''}`.trim() };
}

async function countRecords(dataSourceId) {
  let count = 0; let cursor = undefined;
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    count += json.results?.length ?? 0;
    if (!json.has_more) return count;
    cursor = json.next_cursor;
  }
  return null; // more than 1000 records; treat as unavailable for audit purposes
}

async function readMirrorCounts() {
  const keys = Object.entries(registry).filter(([, c]) => c.enabled).map(([key]) => `cr8w_notion_mirror_${key}`);
  const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/kv_store_8dcd9693`);
  url.searchParams.set('key', `in.(${keys.join(',')})`);
  url.searchParams.set('select', 'key,value');
  const res = await fetch(url, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    findings.push(`mirror read failed: ${res.status}`);
    return {};
  }
  const rows = await res.json();
  const counts = {};
  for (const row of rows) {
    const source = row.key.replace('cr8w_notion_mirror_', '');
    try {
      // Mirror values are double-encoded: jsonb column holding a JSON string.
      let value = row.value;
      if (typeof value === 'string') value = JSON.parse(value);
      if (typeof value === 'string') value = JSON.parse(value);
      if (!Array.isArray(value)) throw new Error('not an array');
      counts[source] = value.length;
    } catch {
      findings.push(`${source}: mirror value is not a JSON array`);
    }
  }
  return counts;
}
