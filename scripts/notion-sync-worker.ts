/**
 * Server-only Notion -> Supabase sync worker (dry-run first release).
 *
 * Contract version: 1.0.0
 * - Pull-only. Default mode is --dry-run; write mode is refused until the
 *   migration, conflict, and authorization gates are approved.
 * - Requires NOTION_API_KEY (server-only). NOTION_API_URL may be overridden
 *   only for local mock tests or a controlled proxy.
 * - Emits a single machine-readable JSON summary on stdout; human diagnostics
 *   go to stderr. Never logs tokens or raw page contents.
 */
import { pathToFileURL } from 'node:url';

const CONTRACT_VERSION = '1.0.0';
const DEFAULT_NOTION_API_URL = 'https://api.notion.com/v1';
const DEFAULT_NOTION_API_VERSION = '2026-03-11';

export interface SourceMapping {
  source: string;
  dataSourceId: string;
  identity: 'page_id';
}

/** Versioned source mappings: canonical Notion data-source IDs, centralized. */
const SOURCE_MAPPINGS: SourceMapping[] = [
  { source: 'projects', dataSourceId: 'bf924acf-799d-82ae-be91-07cbd38ffeae', identity: 'page_id' },
  { source: 'clients', dataSourceId: '57224acf-799d-8231-8b20-8798657e2d79', identity: 'page_id' },
  { source: 'tasks', dataSourceId: '10a24acf-799d-830f-95d5-8747f7ab2531', identity: 'page_id' },
  { source: 'photos_media', dataSourceId: '7c824acf-799d-8338-9e2e-87decd0369d3', identity: 'page_id' },
  { source: 'notes', dataSourceId: '37024acf-799d-82a2-8635-870171412004', identity: 'page_id' },
];

interface CliOptions {
  dryRun: boolean;
  limit: number;
  source?: string;
}

/** Write mode additionally requires this env gate; CLI flags alone never write. */
function isWriteApproved(): boolean {
  return process.env.NOTION_SYNC_WRITE_APPROVED === 'true';
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: true, limit: 100 };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--write') {
      options.dryRun = false;
    } else if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      options.limit = value;
    } else if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

interface NotionProperty {
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  select?: { name: string } | null;
  status?: { name: string } | null;
  date?: { start: string; end: string | null } | null;
  relation?: Array<{ id: string }>;
  checkbox?: boolean;
  email?: string | null;
  phone_number?: string | null;
  url?: string | null;
  number?: number | null;
  files?: unknown[];
  created_time?: string;
  last_edited_time?: string;
  unique_id?: { number: number; prefix?: string | null } | null;
}

export interface NotionPage {
  id: string;
  url: string;
  last_edited_time: string;
  archived: boolean;
  properties: Record<string, NotionProperty>;
}

export interface NormalizedRecord {
  source: string;
  source_page_id: string;
  source_url: string;
  source_last_edited_at: string;
  archived: boolean;
  title: string;
  fields: Record<string, unknown>;
  relations: Record<string, string[]>;
  idempotency_key: string;
}

export interface NotionQueryPage {
  results: NotionPage[];
  hasMore: boolean;
  nextCursor: string | null;
}

function normalizePage(source: string, page: NotionPage): NormalizedRecord {
  let title = '';
  const fields: Record<string, unknown> = {};
  const relations: Record<string, string[]> = {};

  for (const [name, property] of Object.entries(page.properties ?? {})) {
    switch (property.type) {
      case 'title':
        if (!title) title = (property.title ?? []).map(t => t.plain_text).join('');
        break;
      case 'rich_text':
        fields[name] = (property.rich_text ?? []).map(t => t.plain_text).join('');
        break;
      case 'select':
        fields[name] = property.select?.name ?? null;
        break;
      case 'status':
        fields[name] = property.status?.name ?? null;
        break;
      case 'date':
        fields[name] = property.date ? { start: property.date.start, end: property.date.end } : null;
        break;
      case 'relation':
        relations[name] = (property.relation ?? []).map(r => r.id);
        break;
      case 'checkbox':
        fields[name] = property.checkbox ?? false;
        break;
      case 'email':
      case 'phone_number':
      case 'url':
      case 'number':
      case 'created_time':
      case 'last_edited_time':
        fields[name] = property[property.type as keyof NotionProperty] ?? null;
        break;
      case 'unique_id':
        fields[name] = property.unique_id
          ? `${property.unique_id.prefix ?? ''}${property.unique_id.number}`
          : null;
        break;
      case 'files':
        fields[name] = Array.isArray(property.files) ? property.files.length : 0;
        break;
      default:
        // Preserve unknown properties as type markers; never drop silently.
        fields[name] = { _unsupported_type: property.type };
    }
  }

  return {
    source,
    source_page_id: page.id,
    source_url: page.url,
    source_last_edited_at: page.last_edited_time,
    archived: page.archived,
    title,
    fields,
    relations,
    idempotency_key: `notion:${source}:${page.id}:${page.last_edited_time}`,
  };
}

async function queryDataSource(
  apiUrl: string,
  apiKey: string,
  apiVersion: string,
  dataSourceId: string,
  pageSize: number,
  startCursor?: string,
): Promise<NotionQueryPage> {
  const body: { page_size: number; start_cursor?: string } = { page_size: pageSize };
  if (startCursor) body.start_cursor = startCursor;
  const response = await fetch(`${apiUrl}/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'notion-version': apiVersion,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Notion query failed for data source ${dataSourceId}: HTTP ${response.status}`);
  }
  const payload = (await response.json()) as {
    results?: NotionPage[];
    has_more?: boolean;
    next_cursor?: string | null;
  };
  const hasMore = payload.has_more === true;
  const nextCursor = payload.next_cursor ?? null;
  if (hasMore && !nextCursor) {
    throw new Error(`Notion query for data source ${dataSourceId} reported has_more without next_cursor`);
  }
  return {
    results: payload.results ?? [],
    hasMore,
    nextCursor,
  };
}

export interface WriteStore {
  upsertRecords(records: NormalizedRecord[]): Promise<void>;
  insertDeadLetters(entries: Array<{ run_id: string; source: string; source_page_id?: string; reason: string }>): Promise<void>;
  getCheckpoint(source: string): Promise<string | null>;
  saveCheckpoint(source: string, runId: string, recordsSynced: number, nextCursor: string | null): Promise<void>;
  startRun(runId: string, mode: string): Promise<void>;
  finishRun(runId: string, status: string, counts: { planned: number; written: number; deadLetters: number }, error?: string): Promise<void>;
}

export interface SyncTotals {
  planned: number;
  written: number;
  deadLetters: number;
}

interface SyncSourceOptions {
  mapping: SourceMapping;
  apiUrl: string;
  apiKey: string;
  apiVersion: string;
  limit: number;
  runId: string;
  store: WriteStore | null;
  totals: SyncTotals;
  queryPage?: typeof queryDataSource;
}

export async function syncSource({
  mapping,
  apiUrl,
  apiKey,
  apiVersion,
  limit,
  runId,
  store,
  totals,
  queryPage = queryDataSource,
}: SyncSourceOptions) {
  let cursor = store ? await store.getCheckpoint(mapping.source) : null;
  let remaining = limit;
  let fetched = 0;
  let planned = 0;
  let written = 0;
  let deadLetterCount = 0;
  let cursorAdvanced = false;
  let hasMore = true;

  while (remaining > 0 && hasMore) {
    const pageSize = Math.min(remaining, 100);
    const pageResult = await queryPage(
      apiUrl,
      apiKey,
      apiVersion,
      mapping.dataSourceId,
      pageSize,
      cursor ?? undefined,
    );
    const records: NormalizedRecord[] = [];
    const deadLetters: Array<{ run_id: string; source: string; source_page_id?: string; reason: string }> = [];
    for (const page of pageResult.results) {
      try {
        records.push(normalizePage(mapping.source, page));
      } catch (error) {
        deadLetters.push({
          run_id: runId,
          source: mapping.source,
          source_page_id: page?.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    fetched += pageResult.results.length;
    planned += records.length;
    deadLetterCount += deadLetters.length;
    totals.planned += records.length;
    remaining -= pageResult.results.length;

    if (store) {
      // Checkpoint only after every durable write for this Notion page succeeds.
      await store.insertDeadLetters(deadLetters);
      totals.deadLetters += deadLetters.length;
      await store.upsertRecords(records);
      written += records.length;
      totals.written += records.length;
      await store.saveCheckpoint(mapping.source, runId, written, pageResult.nextCursor);
      cursorAdvanced = true;
    } else {
      totals.deadLetters += deadLetters.length;
    }

    cursor = pageResult.nextCursor;
    hasMore = pageResult.hasMore;
  }

  return {
    source: mapping.source,
    data_source_id: mapping.dataSourceId,
    fetched,
    planned_upserts: planned,
    written,
    dead_letters: deadLetterCount,
    cursor_advanced: cursorAdvanced,
  };
}

/** Supabase-backed control-plane store. Loaded lazily so dry-run never needs it. */
async function createSupabaseStore(): Promise<WriteStore> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Write mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Failing closed.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const raise = (error: { message: string } | null) => {
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
  };
  return {
    async upsertRecords(records) {
      raise((await client.from('notion_sync_records').upsert(
        records.map(r => ({
          source: r.source,
          source_page_id: r.source_page_id,
          source_url: r.source_url,
          source_last_edited_at: r.source_last_edited_at,
          archived: r.archived,
          title: r.title,
          fields: r.fields,
          relations: r.relations,
          idempotency_key: r.idempotency_key,
        })),
      )).error);
    },
    async insertDeadLetters(entries) {
      if (entries.length === 0) return;
      raise((await client.from('notion_sync_dead_letters').insert(entries)).error);
    },
    async getCheckpoint(source) {
      const { data, error } = await client
        .from('notion_sync_checkpoints')
        .select('last_cursor')
        .eq('source', source)
        .maybeSingle();
      raise(error);
      return data?.last_cursor ?? null;
    },
    async saveCheckpoint(source, runId, recordsSynced, nextCursor) {
      raise((await client.from('notion_sync_checkpoints').upsert({
        source,
        contract_version: CONTRACT_VERSION,
        last_run_id: runId,
        last_cursor: nextCursor,
        last_completed_at: new Date().toISOString(),
        records_synced: recordsSynced,
      })).error);
    },
    async startRun(runId, mode) {
      raise((await client.from('notion_sync_runs').insert({
        run_id: runId,
        mode,
        contract_version: CONTRACT_VERSION,
        status: 'running',
      })).error);
    },
    async finishRun(runId, status, counts, error) {
      raise((await client.from('notion_sync_runs').update({
        status,
        finished_at: new Date().toISOString(),
        total_planned: counts.planned,
        total_written: counts.written,
        total_dead_letters: counts.deadLetters,
        error: error ?? null,
      }).eq('run_id', runId)).error);
    },
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dryRun && !isWriteApproved()) {
    throw new Error(
      'Write mode is refused: set NOTION_SYNC_WRITE_APPROVED=true after the migration, conflict, and authorization gates are approved. Use --dry-run.',
    );
  }

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY is required (server-only). Failing closed before any network activity.');
  }
  const apiUrl = (process.env.NOTION_API_URL ?? DEFAULT_NOTION_API_URL).replace(/\/+$/, '');
  const apiVersion = process.env.NOTION_API_VERSION ?? DEFAULT_NOTION_API_VERSION;

  const limit = Number(process.env.NOTION_SYNC_LIMIT ?? options.limit) || options.limit;
  const envSource = process.env.NOTION_SYNC_SOURCE || options.source;
  const mappings = envSource
    ? SOURCE_MAPPINGS.filter(m => m.source === envSource)
    : SOURCE_MAPPINGS;
  if (mappings.length === 0) {
    throw new Error(`Unknown source: ${envSource}`);
  }

  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const mode = options.dryRun ? 'dry-run' : 'write';
  const store = options.dryRun ? null : await createSupabaseStore();
  const sources = [];
  const totals: SyncTotals = { planned: 0, written: 0, deadLetters: 0 };

  if (store) await store.startRun(runId, mode);

  try {
    for (const mapping of mappings) {
      sources.push(await syncSource({
        mapping,
        apiUrl,
        apiKey,
        apiVersion,
        limit,
        runId,
        store,
        totals,
      }));
    }
  } catch (error) {
    if (store) {
      await store.finishRun(runId, 'failed', totals,
        error instanceof Error ? error.message : String(error));
    }
    throw error;
  }

  if (store) {
    await store.finishRun(runId, 'completed', totals);
  }

  const summary = {
    run_id: runId,
    mode,
    contract_version: CONTRACT_VERSION,
    total_planned: totals.planned,
    total_written: totals.written,
    total_dead_letters: totals.deadLetters,
    sources,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`notion-sync-worker: ${message}\n`);
    process.exit(1);
  });
}
