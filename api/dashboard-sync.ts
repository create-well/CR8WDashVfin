import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ENABLED_NOTION_SOURCES, publicSourceMetadata } from './notion-sources.js';

const TABLE = 'kv_store_8dcd9693';
const OPERATIONAL_KEYS = [
  'cr8w_tasks', 'cr8w_stations', 'cr8w_forum', 'cr8w_messages',
  'cr8w_braindumps', 'cr8w_announcements', 'cr8w_forum_replies',
  'cr8w_workshops', 'cr8w_workshop_programs', 'cr8w_workshop_resources',
  'cr8w_coflow_dates', 'cr8w_coflow_checkins', 'cr8w_well_notes',
  'cr8w_calendar_events', 'cr8w_notion_sync_meta',
];
const MIRROR_KEYS = ENABLED_NOTION_SOURCES.map(([source]) => `cr8w_notion_mirror_${source}`);
const KEYS = [...OPERATIONAL_KEYS, ...MIRROR_KEYS];

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase server configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}

interface SourceFreshness {
  status: 'ok' | 'error';
  recordCount: number;
  sourceLastEditedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  error?: string;
}

function parseList(raw: unknown): unknown[] {
  if (!raw) return [];
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function parseObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { data, error } = await supabase().from(TABLE).select('key,value').in('key', [...KEYS]);
    if (error) throw new Error('Dashboard sync read failed');

    const values = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
    const freshness = parseObject(values.cr8w_notion_sync_meta);
    const sourceFreshness = parseObject(freshness.sourceFreshness);
    const mirrors = Object.fromEntries(
      ENABLED_NOTION_SOURCES.map(([source]) => [source, parseList(values[`cr8w_notion_mirror_${source}`])]),
    );
    const notionSources = ENABLED_NOTION_SOURCES.map(([source, config]) => publicSourceMetadata(source, config, mirrors[source].length));

    res.json({
      tasks: parseList(values.cr8w_tasks),
      stations: parseList(values.cr8w_stations),
      forum: parseList(values.cr8w_forum),
      messages: parseList(values.cr8w_messages),
      braindumps: parseList(values.cr8w_braindumps),
      announcements: parseList(values.cr8w_announcements),
      forumReplies: parseList(values.cr8w_forum_replies),
      workshops: parseList(values.cr8w_workshops),
      workshopPrograms: parseList(values.cr8w_workshop_programs),
      workshopResources: parseList(values.cr8w_workshop_resources),
      coflowDates: parseList(values.cr8w_coflow_dates),
      coflowCheckins: parseList(values.cr8w_coflow_checkins),
      wellNotes: parseList(values.cr8w_well_notes),
      calendarEvents: parseList(values.cr8w_calendar_events),
      notionMirrors: mirrors,
      notionSources,
      freshness: {
        source: freshness.source === 'notion' ? 'notion' : 'unknown',
        mirrorUpdatedAt: typeof freshness.mirrorUpdatedAt === 'string' ? freshness.mirrorUpdatedAt : null,
        sourceLastEditedAt: typeof freshness.sourceLastEditedAt === 'string' ? freshness.sourceLastEditedAt : null,
        syncRunId: typeof freshness.syncRunId === 'string' ? freshness.syncRunId : null,
        sourceFreshness: Object.fromEntries(Object.entries(sourceFreshness).flatMap(([source, value]) => {
          const item = parseObject(value);
          const status = item.status === 'error' ? 'error' : item.status === 'ok' ? 'ok' : null;
          if (!status) return [];
          return [[source, {
            status,
            recordCount: typeof item.recordCount === 'number' ? item.recordCount : 0,
            sourceLastEditedAt: typeof item.sourceLastEditedAt === 'string' ? item.sourceLastEditedAt : null,
            lastSuccessfulSyncAt: typeof item.lastSuccessfulSyncAt === 'string' ? item.lastSuccessfulSyncAt : null,
            ...(typeof item.error === 'string' ? { error: item.error } : {}),
          } satisfies SourceFreshness]];
        })),
      },
    });
  } catch {
    res.status(500).json({ error: 'Dashboard sync unavailable' });
  }
}
