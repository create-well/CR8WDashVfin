import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENABLED_NOTION_SOURCES, NOTION_SOURCES, type NotionPropertySensitivity, type NotionSourceConfig, type NotionSourceKey } from './notion-sources.js';
import { normalizeNotionProperty } from './notion-property-envelope.js';
import { NOTION_RECORD_SCHEMA_VERSION, type NotionValidationIssue } from '../src/shared/notion-contract.js';

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

export type SourceSelection =
  | { entries: [NotionSourceKey, NotionSourceConfig][]; error: null }
  | { entries: null; error: string };

/**
 * Resolves the optional `sources` request filter against the enabled registry.
 * Returns a 400-ready error for empty lists or unknown/disabled source keys.
 */
export function resolveSourceEntries(requested: unknown): SourceSelection {
  if (requested === undefined || requested === null) return { entries: ENABLED_NOTION_SOURCES, error: null };
  if (!Array.isArray(requested) || requested.length === 0) {
    return { entries: null, error: 'sources must contain only enabled Notion source keys and at least one source' };
  }
  const entries = ENABLED_NOTION_SOURCES.filter(([source]) => requested.includes(source));
  if (entries.length !== requested.length) {
    return { entries: null, error: 'sources must contain only enabled Notion source keys and at least one source' };
  }
  return { entries, error: null };
}

const VALID_SENSITIVITIES = new Set(['public', 'team', 'restricted']);

/**
 * Contract-style validation for mirror records on the repo's current write path.
 * Record-level fields are always checked; property envelopes are checked when the
 * source runs with typedProperties (repo envelope shape from notion-property-envelope).
 */
export function validateMirrorRecord(record: MirrorRecord, typed: boolean): NotionValidationIssue[] {
  const issues: NotionValidationIssue[] = [];
  if (!(record.source in NOTION_SOURCES)) issues.push({ path: 'source', message: 'Unknown Notion source' });
  if (typeof record.sourcePageId !== 'string' || !record.sourcePageId) issues.push({ path: 'sourcePageId', message: 'Expected a stable source page ID' });
  if (!record.properties || typeof record.properties !== 'object' || Array.isArray(record.properties)) {
    return [...issues, { path: 'properties', message: 'Expected a property map' }];
  }
  if (!typed) return issues;
  for (const [name, envelope] of Object.entries(record.properties)) {
    const path = `properties.${name}`;
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
      issues.push({ path, message: 'Expected a typed property envelope' });
      continue;
    }
    const candidate = envelope as { type?: unknown; value?: unknown; sensitivity?: unknown; sourceProperty?: unknown };
    if (typeof candidate.type !== 'string' || !candidate.type) issues.push({ path: `${path}.type`, message: 'Expected a Notion property type' });
    if (!('value' in candidate)) issues.push({ path: `${path}.value`, message: 'Expected an envelope value' });
    if (typeof candidate.sensitivity !== 'string' || !VALID_SENSITIVITIES.has(candidate.sensitivity)) issues.push({ path: `${path}.sensitivity`, message: 'Unsupported sensitivity' });
    if (typeof candidate.sourceProperty !== 'string' || !candidate.sourceProperty) issues.push({ path: `${path}.sourceProperty`, message: 'Expected the source property name' });
    if (candidate.type === 'number' && candidate.value !== null
        && (typeof candidate.value !== 'number' || !Number.isFinite(candidate.value))) {
      issues.push({ path: `${path}.value`, message: 'Number values must be finite or null' });
    }
  }
  return issues;
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

/**
 * Atomic publication path. Disabled unless CR8W_ATOMIC_RPC_ENABLED === 'true'.
 * When enabled, all source snapshots plus sync metadata publish through one
 * database transaction via public.cr8w_publish_notion_snapshot. There is no
 * fallback to the sequential writer inside a run: a rejected bundle fails the
 * run with zero writes. Emergency rollback = turn the flag off.
 */
const ATOMIC_RPC_FLAG = 'CR8W_ATOMIC_RPC_ENABLED';
const RPC_APPROVED_KEYS = new Set([
  'cr8w_notion_mirror_people',
  'cr8w_notion_mirror_flows',
  'cr8w_notion_mirror_moves',
  'cr8w_notion_mirror_content',
  'cr8w_notion_mirror_money',
  'cr8w_notion_mirror_engineeringDelivery',
  'cr8w_notion_sync_meta',
]);

export function atomicRpcEnabled(): boolean {
  return (process.env[ATOMIC_RPC_FLAG] ?? '').trim().toLowerCase() === 'true';
}

export interface AtomicPublishSnapshot {
  key: string;
  present: boolean;
  value?: string;
}

export interface AtomicPublishPayload {
  p_run_id: string;
  p_record_schema_version: typeof NOTION_RECORD_SCHEMA_VERSION;
  p_typed_sources: string[];
  p_source_last_edited_at: string | null;
  p_snapshots: AtomicPublishSnapshot[];
}

/**
 * Builds the RPC bundle. Snapshot values are serialized JSON strings; the
 * database function validates and stores them as the catalog-confirmed type.
 * Every record carries recordSchemaVersion 2 as the v2 contract requires,
 * and metadata syncRunId/sourceLastEditedAt must match the RPC parameters
 * exactly or the function rejects the bundle.
 */
export function buildAtomicPublishPayload(args: {
  runId: string;
  successful: SourceSyncResult[];
  counts: Record<string, number>;
  sourceFreshness: Record<string, SourceFreshness>;
  typedSources: string[];
  latestSourceEdit: string | null;
  mirrorUpdatedAt: string | null;
}): AtomicPublishPayload {
  const snapshots: AtomicPublishSnapshot[] = args.successful.map(result => ({
    key: `cr8w_notion_mirror_${result.source}`,
    present: true,
    value: JSON.stringify((result.records ?? []).map(record => ({ ...record, recordSchemaVersion: NOTION_RECORD_SCHEMA_VERSION }))),
  }));
  snapshots.push({
    key: 'cr8w_notion_sync_meta',
    present: true,
    value: JSON.stringify({
      source: 'notion',
      mirrorUpdatedAt: args.mirrorUpdatedAt,
      sourceLastEditedAt: args.latestSourceEdit,
      syncRunId: args.runId,
      counts: args.counts,
      sourceFreshness: args.sourceFreshness,
      recordSchemaVersion: NOTION_RECORD_SCHEMA_VERSION,
      typedSources: args.typedSources,
    }),
  });
  for (const snapshot of snapshots) {
    if (!RPC_APPROVED_KEYS.has(snapshot.key)) {
      throw new Error(`Atomic publish refused: ${snapshot.key} is not an approved CR8W mirror key`);
    }
  }
  return {
    p_run_id: args.runId,
    p_record_schema_version: NOTION_RECORD_SCHEMA_VERSION,
    p_typed_sources: args.typedSources,
    p_source_last_edited_at: args.latestSourceEdit,
    p_snapshots: snapshots,
  };
}

async function publishAtomic(db: Database, payload: AtomicPublishPayload): Promise<{ keys_written?: number }> {
  const { data, error } = await db.rpc('cr8w_publish_notion_snapshot', payload as unknown as Record<string, unknown>);
  if (error) throw new Error(`Atomic publish failed: ${error.code ?? 'unknown'}`);
  const result = data as { committed?: boolean; keys_written?: number } | null;
  if (!result || result.committed !== true) throw new Error('Atomic publish did not commit');
  return result;
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

function propertyValue(sourceProperty: string, property: NotionPropertyResponse | null | undefined, typed = false, sensitivity: NotionPropertySensitivity = 'team'): unknown {
  if (!property || !property.type) return null;
  if (typed) return normalizeNotionProperty(sourceProperty, property, sensitivity);
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
  return normalized;
}

function normalize(page: NotionPageResponse, source: NotionSourceKey, typedProperties = false, sensitivity: NotionPropertySensitivity = 'team'): MirrorRecord {
  return {
    source,
    sourcePageId: page.id,
    sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null,
    archived: Boolean(page.archived),
    properties: Object.fromEntries(Object.entries(page.properties ?? {}).map(([name, value]) => [name, propertyValue(name, value, typedProperties, sensitivity)])),
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

export async function runSync(dryRun: boolean, entries: [NotionSourceKey, NotionSourceConfig][] = ENABLED_NOTION_SOURCES) {
  const runId = `notion-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const db = database();
  const previousMeta = await readMirrorMeta(db);
  const completedAt = new Date().toISOString();

  const validationErrors: NotionValidationIssue[] = [];
  const sourceResults: SourceSyncResult[] = await Promise.all(entries.map(async ([source, config]) => {
    try {
      const records = await fetchSource(source, config);
      const issues = records.flatMap((record, index) => validateMirrorRecord(record, config.typedProperties)
        .map(issue => ({ ...issue, path: `${source}[${index}].${issue.path}` })));
      if (issues.length) {
        validationErrors.push(...issues);
        const preview = issues.slice(0, 3).map(issue => `${issue.path}: ${issue.message}`).join('; ');
        return { source, records: null, error: `Contract validation failed: ${preview}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ''}` };
      }
      return { source, records, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Source sync failed';
      return { source, records: null, error: message };
    }
  }));

  const { sourceFreshness, successful, failed, recordsSeen, counts, latestSourceEdit } = summarizeSourceResults(sourceResults, previousMeta.sourceFreshness, completedAt);
  const typedSources = successful.filter(result => NOTION_SOURCES[result.source].typedProperties).map(result => result.source);

  let writer: 'none' | 'sequential' | 'atomic-rpc' = 'none';
  if (!dryRun) {
    const mirrorUpdatedAt = successful.length ? completedAt : previousMeta.mirrorUpdatedAt;
    if (atomicRpcEnabled()) {
      const payload = buildAtomicPublishPayload({ runId, successful, counts, sourceFreshness, typedSources, latestSourceEdit, mirrorUpdatedAt });
      await publishAtomic(db, payload);
      writer = 'atomic-rpc';
    } else {
      for (const result of successful) await writeMirror(db, `cr8w_notion_mirror_${result.source}`, result.records);
      await writeMirror(db, 'cr8w_notion_sync_meta', {
        source: 'notion',
        mirrorUpdatedAt,
        sourceLastEditedAt: latestSourceEdit,
        syncRunId: runId,
        counts,
        sourceFreshness,
        recordSchemaVersion: NOTION_RECORD_SCHEMA_VERSION,
        typedSources,
      });
      writer = 'sequential';
    }
  }
  return { ok: true, dryRun, writer, runId, recordsSeen, counts, latestSourceEdit, sourceFreshness, recordSchemaVersion: NOTION_RECORD_SCHEMA_VERSION, typedSources, validationErrors, failedSources: failed.map(result => ({ source: result.source, error: result.error })), writes: dryRun ? 0 : successful.length + 1 };
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
    const selection = resolveSourceEntries(request.sources);
    if (selection.entries === null) { res.status(400).json({ error: selection.error }); return; }
    res.json(await runSync(dryRun, selection.entries));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Notion sync failed' });
  }
}
