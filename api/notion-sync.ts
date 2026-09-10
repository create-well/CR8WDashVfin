import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ENABLED_NOTION_SOURCES, type NotionSourceConfig, type NotionSourceKey } from './notion-sources.js';

const TABLE = 'kv_store_8dcd9693';
function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase server configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}
async function writeMirror(key: string, value: unknown) {
  const { error } = await database().from(TABLE).upsert({ key, value: JSON.stringify(value) });
  if (error) throw new Error(`Mirror write failed for ${key}: ${error.code ?? 'unknown'}`);
}
function authorized(req: VercelRequest) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.NOTION_SYNC_OPERATOR_TOKEN ?? '';
  return Boolean(token && expected && token === expected);
}
export interface NotionPropertyValue {
  type: string;
  value: unknown;
  displayValue: string;
  sensitivity: NotionSourceConfig['sensitivity'];
}
function primitiveValue(property: any): unknown {
  if (!property || !property.type) return null;
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') return (value ?? []).map((item: any) => item.plain_text ?? item.text?.content ?? '').join('');
  if (property.type === 'checkbox') return Boolean(value);
  if (property.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : null;
  if (property.type === 'select' || property.type === 'status') return value?.name ?? null;
  if (property.type === 'multi_select') return (value ?? []).map((item: any) => item.name);
  if (property.type === 'date') return value ? { start: value.start ?? null, end: value.end ?? null, time_zone: value.time_zone ?? null } : null;
  if (property.type === 'people' || property.type === 'relation') return (value ?? []).map((item: any) => item.id);
  if (property.type === 'unique_id') return value ? `${value.prefix ?? ''}${value.number ?? ''}` : null;
  if (property.type === 'formula') return value?.[value.type] ?? null;
  if (property.type === 'rollup') return value?.type === 'array' ? value.array : value?.[value.type] ?? null;
  return value ?? null;
}
function displayValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function propertyValue(property: any, config: NotionSourceConfig): unknown {
  const value = primitiveValue(property);
  if (!config.typedProperties) return value;
  const typed: NotionPropertyValue = { type: property?.type ?? 'unknown', value, displayValue: displayValue(value), sensitivity: config.sensitivity };
  return typed;
}
function normalize(page: any, source: NotionSourceKey, config: NotionSourceConfig) {
  return {
    source, sourcePageId: page.id, sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null, archived: Boolean(page.archived),
    properties: Object.fromEntries(Object.entries(page.properties ?? {}).map(([name, value]) => [name, propertyValue(value, config)])),
  };
}
async function notion(path: string, options: RequestInit = {}) {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('Missing NOTION_API_KEY');
  const response = await fetch(`https://api.notion.com/v1${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error(`Notion request failed with status ${response.status}`);
  return response.json();
}
async function fetchSource(source: NotionSourceKey, config: NotionSourceConfig) {
  const records: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await notion(`/data_sources/${config.dataSourceId}/query`, { method: 'POST', body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }) });
    records.push(...(page.results ?? []).map((item: any) => normalize(item, source, config)));
    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);
  return records;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!authorized(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const request = req.body && typeof req.body === 'object' ? req.body : {};
    const dryRun = request.dryRun !== false;
    const runId = `notion-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const snapshots: Record<string, any[]> = {};
    let recordsSeen = 0; let latestSourceEdit: string | null = null;
    const sourceResults = await Promise.all(ENABLED_NOTION_SOURCES.map(async ([source, config]) => [source, await fetchSource(source, config)] as const));
    for (const [source, records] of sourceResults) { snapshots[source] = records; recordsSeen += records.length; for (const record of records) if (record.sourceLastEditedAt && (!latestSourceEdit || record.sourceLastEditedAt > latestSourceEdit)) latestSourceEdit = record.sourceLastEditedAt; }
    const counts = Object.fromEntries(Object.entries(snapshots).map(([source, records]) => [source, records.length]));
    if (!dryRun) { for (const [source, records] of Object.entries(snapshots)) await writeMirror(`cr8w_notion_mirror_${source}`, records); await writeMirror('cr8w_notion_sync_meta', { source: 'notion', mirrorUpdatedAt: new Date().toISOString(), sourceLastEditedAt: latestSourceEdit, syncRunId: runId, counts }); }
    res.json({ ok: true, dryRun, runId, recordsSeen, counts, latestSourceEdit, writes: dryRun ? 0 : Object.keys(snapshots).length + 1 });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Notion sync failed' }); }
}
