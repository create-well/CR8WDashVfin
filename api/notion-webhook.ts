import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runSync } from './notion-sync.js';
import { ENABLED_NOTION_SOURCES, type NotionSourceConfig, type NotionSourceKey } from './notion-sources.js';

const TABLE = 'kv_store_8dcd9693';
const DEBOUNCE_KEY = 'cr8w_notion_webhook_last_run';
const DEBOUNCE_MS = 20_000;
const LOG_PREFIX = '[notion-webhook]';

// Signature verification needs the exact raw bytes Notion sent, so the
// framework's JSON body parsing is disabled and the stream is read manually.
export const config = { api: { bodyParser: false } };

function database(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase server configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(rawBody: Buffer, header: unknown): boolean {
  const secret = process.env.NOTION_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : '';
  const match = /^sha256=([0-9a-f]+)$/i.exec(provided.trim());
  if (!match) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const providedDigest = match[1].toLowerCase();
  if (providedDigest.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(providedDigest, 'hex'), Buffer.from(expected, 'hex'));
}

/** Reads the debounce marker using the same KV pattern as the sync writer. */
async function readLastRun(db: SupabaseClient): Promise<number | null> {
  const { data, error } = await db.from(TABLE).select('value').eq('key', DEBOUNCE_KEY).maybeSingle();
  if (error || !data?.value) return null;
  try {
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const at = typeof parsed?.ranAt === 'string' ? Date.parse(parsed.ranAt) : NaN;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

async function writeLastRun(db: SupabaseClient, ranAt: string): Promise<void> {
  const { error } = await db.from(TABLE).upsert({ key: DEBOUNCE_KEY, value: JSON.stringify({ ranAt }) });
  if (error) throw new Error(`Webhook debounce write failed: ${error.code ?? 'unknown'}`);
}

function normalizeDataSourceId(id: string): string {
  const hex = id.toLowerCase().replace(/-/g, '');
  return hex.length === 32
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    : id.toLowerCase();
}

/** Extracts a data_source_id from a Notion webhook event payload, if present. */
export function extractDataSourceId(body: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    body.data_source_id,
    (body.data as Record<string, unknown> | undefined)?.data_source_id,
    (body.entity as Record<string, unknown> | undefined)?.type === 'data_source'
      ? (body.entity as Record<string, unknown>).id
      : undefined,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate;
  }
  return null;
}

/** Maps a Notion data_source_id to an enabled registry entry, if it matches one. */
export function resolveEntriesForDataSource(dataSourceId: string | null): [NotionSourceKey, NotionSourceConfig][] {
  if (!dataSourceId) return ENABLED_NOTION_SOURCES;
  const normalized = normalizeDataSourceId(dataSourceId);
  const match = ENABLED_NOTION_SOURCES.find(([, configEntry]) => configEntry.dataSourceId.toLowerCase() === normalized);
  return match ? [match] : ENABLED_NOTION_SOURCES;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let rawBody: Buffer;
  let body: Record<string, unknown>;
  try {
    rawBody = await readRawBody(req);
    body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) as Record<string, unknown> : {};
  } catch (error) {
    console.log(`${LOG_PREFIX} malformed body: ${error instanceof Error ? error.message : 'unparseable'}`);
    // Malformed and unauthenticated: not a signature failure, so avoid a retry storm.
    res.status(200).json({ ok: false, error: 'malformed payload' });
    return;
  }

  // Subscription verification handshake: Notion posts a verification_token when
  // the subscription is created. Log it for operator retrieval from runtime logs;
  // never write it to the KV mirror.
  if (typeof body.verification_token === 'string' && body.verification_token) {
    console.log(`${LOG_PREFIX} verification_token=${body.verification_token}`);
    res.status(200).json({ ok: true, received: 'verification_token' });
    return;
  }

  if (!verifySignature(rawBody, req.headers['x-notion-signature'])) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const db = database();
    const lastRun = await readLastRun(db);
    if (lastRun !== null && Date.now() - lastRun < DEBOUNCE_MS) {
      console.log(`${LOG_PREFIX} skipped=debounced lastRun=${new Date(lastRun).toISOString()}`);
      res.status(200).json({ ok: true, skipped: 'debounced' });
      return;
    }
    await writeLastRun(db, new Date().toISOString());

    const dataSourceId = extractDataSourceId(body);
    const entries = resolveEntriesForDataSource(dataSourceId);
    const result = await runSync(false, entries);
    console.log(`${LOG_PREFIX} synced sources=${entries.map(([source]) => source).join(',')} runId=${result.runId}`);
    res.status(200).json({ ok: true, sources: entries.map(([source]) => source), counts: result.counts });
  } catch (error) {
    // Authenticated but failed: log and still answer 200 so Notion does not retry-storm.
    console.log(`${LOG_PREFIX} error=${error instanceof Error ? error.message : 'sync failed'}`);
    res.status(200).json({ ok: false, error: 'sync failed, see logs' });
  }
}
