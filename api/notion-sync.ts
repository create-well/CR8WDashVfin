import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENABLED_NOTION_SOURCES, type NotionPropertySensitivity, type NotionSourceKey } from './notion-sources.js';

const TABLE = 'kv_store_8dcd9693';
type Database = SupabaseClient;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface NotionRichTextItem {
  plain_text?: string;
  text?: { content?: string };
}

interface NotionPropertyResponse {
  type: string;
  [key: string]: unknown;
}

interface NotionPageResponse {
  id: string;
  url?: string | null;
  last_edited_time?: string | null;
  archived?: boolean;
  properties?: Record<string, NotionPropertyResponse>;
}

interface NotionQueryResponse {
  results?: NotionPageResponse[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface MirrorRecord {
  source: NotionSourceKey;
  sourcePageId: string;
  sourceUrl: string | null;
  sourceLastEditedAt: string | null;
  archived: boolean;
  properties: Record<string, unknown>;
}

export interface NotionPropertyValue {
  type: string;
  value: unknown;
  displayValue?: string;
  sensitivity?: NotionPropertySensitivity;
}

export interface SourceFreshness {
  status: 'ok' | 'error';
  recordCount: number;
  sourceLastEditedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  error?: string;
}

export interface SourceSyncResult {
  source: NotionSourceKey;
  records: MirrorRecord[] | null;
  error: string | null;
}

export interface SourceSyncSummary {
  sourceFreshness: Record<string, SourceFreshness>;
  counts: Record<string, number>;
  recordsSeen: number;
  latestSourceEdit: string | null;
  successful: SourceSyncResult[];
  failed: SourceSyncResult[];
}

export function summarizeSourceResults(
  results: SourceSyncResult[],
  previousFreshness: Record<string, SourceFreshness>,
  completedAt: string,
): SourceSyncSummary {
  const sourceFreshness: Record<string, SourceFreshness> = { ...previousFreshness };
  for (const result of results) {
    if (result.records) {
      const latest = result.records.reduce<string | null>((latestEdit, record) => record.sourceLastEditedAt && (!latestEdit || record.sourceLastEditedAt > latestEdit) ? record.sourceLastEditedAt : latestEdit, null);
      sourceFreshness[result.source] = { status: 'ok', recordCount: result.records.length, sourceLastEditedAt: latest, lastSuccessfulSyncAt: completedAt };
    } else {
      sourceFreshness[result.source] = { ...(previousFreshness[result.source] ?? { recordCount: 0, sourceLastEditedAt: null, lastSuccessfulSyncAt: null }), status: 'error', ...(result.error ? { error: result.error } : {}) };
    }
  }
  const successful = results.filter(result => result.records !== null);
  const failed = results.filter(result => result.error);
  const recordsSeen = successful.reduce((total, result) => total + (result.records?.length ?? 0), 0);
  const counts = Object.fromEntries(results.map(result => [result.source, result.records?.length ?? previousFreshness[result.source]?.recordCount ?? 0]));
  const latestSourceEdit = Object.values(sourceFreshness).reduce<string | null>((latest, source) => source.sourceLastEditedAt && (!latest || source.sourceLastEditedAt > latest) ? source.sourceLastEditedAt : latest, null);
  return { sourceFreshness, counts, recordsSeen, latestSourceEdit, successful, failed };
}

function database(): Database {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase server configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function writeMirror(db: Database, key: string, value: unknown) {
  const { error } = await db.from(TABLE).upsert({ key, value: JSON.stringify(value) });
  if (error) throw new Error(`Mirror write failed for ${key}: ${error.code ?? 'unknown'}`);
}

async function readMirrorMeta(db: Database): Promise<{ mirrorUpdatedAt: string | null; sourceFreshness: Record<string, SourceFreshness> }> {
  const { data, error } = await db.from(TABLE).select('value').eq('key', 'cr8w_notion_sync_meta').maybeSingle();
  if (error || !data?.value) return { mirrorUpdatedAt: null, sourceFreshness: {} };
  try {
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return {
      mirrorUpdatedAt: typeof parsed?.mirrorUpdatedAt === 'string' ? parsed.mirrorUpdatedAt : null,
      sourceFreshness: parsed?.sourceFreshness && typeof parsed.sourceFreshness === 'object' ? parsed.sourceFreshness : {},
    };
  } catch {
    return { mirrorUpdatedAt: null, sourceFreshness: {} };
  }
}

function authorized(req: VercelRequest) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.NOTION_SYNC_OPERATOR_TOKEN ?? '';
  return Boolean(token && expected && token === expected);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function propertyValue(property: NotionPropertyResponse | null | undefined, typed = false, sensitivity: NotionPropertySensitivity = 'team'): unknown {
  if (!property || !property.type) return null;
  const value = property[property.type];
  let normalized: unknown;
  if (property.type === 'title' || property.type === 'rich_text') {
    normalized = asArray(value).map(item => {
      const text = asRecord(item) as NotionRichTextItem;
      return text.plain_text ?? text.text?.content ?? '';
    }).join('');
  } else if (property.type === 'checkbox') normalized = Boolean(value);
  else if (property.type === 'number') normalized = typeof value === 'number' && Number.isFinite(value) ? value : null;
  else if (property.type === 'select' || property.type === 'status') normalized = asRecord(value).name ?? null;
  else if (property.type === 'multi_select') normalized = asArray(value).map(item => asRecord(item).name).filter((name): name is string => typeof name === 'string');
  else if (property.type === 'date') {
    const date = asRecord(value);
    normalized = value ? { start: date.start ?? null, end: date.end ?? null, time_zone: date.time_zone ?? null } : null;
  } else if (property.type === 'people' || property.type === 'relation') normalized = asArray(value).map(item => asRecord(item).id).filter((id): id is string => typeof id === 'string');
  else if (property.type === 'unique_id') {
    const uniqueId = asRecord(value);
    normalized = value ? `${typeof uniqueId.prefix === 'string' ? uniqueId.prefix : ''}${typeof uniqueId.number === 'number' ? uniqueId.number : ''}` : null;
  } else if (property.type === 'formula') {
    const formula = asRecord(value);
    normalized = formula[typeof formula.type === 'string' ? formula.type : ''] ?? null;
  } else if (property.type === 'rollup') {
    const rollup = asRecord(value);
    normalized = rollup.type === 'array' ? rollup.array : rollup[typeof rollup.type === 'string' ? rollup.type : ''] ?? null;
  } else normalized = value ?? null;
  if (!typed) return normalized;
  const displayValue = typeof normalized === 'string' || typeof normalized === 'number' || typeof normalized === 'boolean'
    ? String(normalized)
    : undefined;
  return { type: property.type, value: normalized, ...(displayValue ? { displayValue } : {}), sensitivity } satisfies NotionPropertyValue;
}

function normalize(page: NotionPageResponse, source: NotionSourceKey, typedProperties = false, sensitivity: NotionPropertySensitivity = 'team'): MirrorRecord {
  return {
    source,
    sourcePageId: page.id,
    sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null,
    archived: Boolean(page.archived),
    properties: Object.fromEntries(Object.entries(page.properties ?? {}).map(([name, value]) => [name, propertyValue(value, typedProperties, sensitivity)])),
  };
}

async function notion<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('Missing NOTION_API_KEY');
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Notion request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchSource(source: NotionSourceKey, config: { dataSourceId: string; typedProperties: boolean; sensitivity: NotionPropertySensitivity }): Promise<MirrorRecord[]> {
  const records: MirrorRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await notion<NotionQueryResponse>(`/data_sources/${config.dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    records.push(...(page.results ?? []).map(item => normalize(item, source, config.typedProperties, config.sensitivity)));
    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);
  return records;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!authorized(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const request = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const dryRun = request.dryRun !== false;
    const runId = `notion-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const db = database();
    const previousMeta = await readMirrorMeta(db);
    const completedAt = new Date().toISOString();

    const sourceResults: SourceSyncResult[] = await Promise.all(ENABLED_NOTION_SOURCES.map(async ([source, config]) => {
      try {
        const records = await fetchSource(source, config);
        return { source, records, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Source sync failed';
        return { source, records: null, error: message };
      }
    }));

    const { sourceFreshness, successful, failed, recordsSeen, counts, latestSourceEdit } = summarizeSourceResults(sourceResults, previousMeta.sourceFreshness, completedAt);

    if (!dryRun) {
      for (const result of successful) await writeMirror(db, `cr8w_notion_mirror_${result.source}`, result.records);
      await writeMirror(db, 'cr8w_notion_sync_meta', {
        source: 'notion',
        mirrorUpdatedAt: successful.length ? completedAt : previousMeta.mirrorUpdatedAt,
        sourceLastEditedAt: latestSourceEdit,
        syncRunId: runId,
        counts,
        sourceFreshness,
      });
    }
    res.json({ ok: true, dryRun, runId, recordsSeen, counts, latestSourceEdit, sourceFreshness, failedSources: failed.map(result => ({ source: result.source, error: result.error })), writes: dryRun ? 0 : successful.length + 1 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Notion sync failed' });
  }
}
