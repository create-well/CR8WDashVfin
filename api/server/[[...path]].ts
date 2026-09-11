/**
 * CR8W Create Well — Vercel API catch-all
 * File-based routing: api/server/[[...path]].ts handles every request to
 *   /api/server          (health check, with path = undefined)
 *   /api/server/sync     (path = ['sync'])
 *   /api/server/tasks/5  (path = ['tasks', '5'])
 *   etc.
 * Vercel automatically populates req.query.path with the matched segments.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { CalendarSyncError, syncCalendarIcal } from '../calendar-ical-sync.js';
import { deriveCalendarSyncState } from '../calendar-sync-health.js';

// ── Supabase client ───────────────────────────────────────────────────────────
function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('SUPABASE_URL + SUPABASE_SECRET_KEY must be set');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Auth: accept publishable key (app-gate) or a valid Supabase user JWT ──────
async function verifyRequest(req: VercelRequest): Promise<boolean> {
  const raw = req.headers.authorization ?? '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) return false;
  const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
  // Fast path: exact match against the publishable key (hash-login sessions)
  if (pubKey && token === pubKey) return true;
  // JWT path: verify as a Supabase user access token
  if (pubKey) {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: pubKey,
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) return true;
    } catch { /* fall through */ }
  }
  return !pubKey; // allow when no key configured (dev/preview)
}

const TABLE = 'kv_store_8dcd9693';

// ── KV helpers ────────────────────────────────────────────────────────────────
async function kvGet(key: string): Promise<any> {
  const { data, error } = await sb().from(TABLE).select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}
async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await sb().from(TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
}
function parseList(raw: any): any[] {
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []; }
  catch { return []; }
}
function parseObject(raw: any): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
async function getList(key: string): Promise<any[]> { return parseList(await kvGet(key)); }
async function setList(key: string, list: any[]): Promise<void> { await kvSet(key, JSON.stringify(list)); }

const NOTION_SOURCES = {
  people: 'b97bcbdf-2b1b-488d-9d07-4012b031732e',
  flows: 'c1677843-dd13-4e37-9f80-e960b26847dc',
  moves: '5597e583-f7df-4f6c-90b0-296a26c57454',
  content: 'cd410d33-8052-4897-8226-3a3ca84ea8bc',
  money: '55832c19-38fa-44cb-b4c2-0174b4c5b207',
} as const;

type NotionProperty = Record<string, any>;

function notionValue(property: NotionProperty): unknown {
  if (!property || !property.type) return null;
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') {
    return (value ?? []).map((item: any) => item.plain_text ?? item.text?.content ?? '').join('');
  }
  if (property.type === 'select' || property.type === 'status') return value?.name ?? null;
  if (property.type === 'multi_select') return (value ?? []).map((item: any) => item.name);
  if (property.type === 'date') return value ? { start: value.start ?? null, end: value.end ?? null, time_zone: value.time_zone ?? null } : null;
  if (property.type === 'people') return (value ?? []).map((item: any) => item.id);
  if (property.type === 'relation') return (value ?? []).map((item: any) => item.id);
  if (property.type === 'unique_id') return value ? `${value.prefix ?? ''}${value.number ?? ''}` : null;
  if (property.type === 'formula') return value?.[value.type] ?? null;
  if (property.type === 'rollup') return value?.type === 'array' ? value.array : value?.[value.type] ?? null;
  return value ?? null;
}

function normalizeNotionPage(page: any, source: string) {
  const properties = Object.fromEntries(
    Object.entries(page.properties ?? {}).map(([name, property]) => [name, notionValue(property as NotionProperty)]),
  );
  return {
    source,
    sourcePageId: page.id,
    sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null,
    archived: Boolean(page.archived),
    properties,
  };
}

async function notionRequest(path: string, options: RequestInit = {}): Promise<any> {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('Missing NOTION_API_KEY');
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Notion request failed with status ${response.status}`);
  return response.json();
}

async function fetchNotionSource(source: string, dataSourceId: string) {
  const pages: any[] = [];
  let cursor: string | undefined;
  do {
    const result = await notionRequest(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    pages.push(...(result.results ?? []).map((page: any) => normalizeNotionPage(page, source)));
    cursor = result.has_more ? result.next_cursor ?? undefined : undefined;
  } while (cursor);
  return pages;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Body parser ───────────────────────────────────────────────────────────────
function readBody(req: VercelRequest): Promise<any> {
  return new Promise(resolve => {
    if (req.body) { resolve(req.body); return; }
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Auth gate — health endpoint is public; everything else requires a valid token
  const pathCheck = !req.query.path ? [] : Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const firstSeg = pathCheck[0] ?? '';
  if (firstSeg && firstSeg !== 'health') {
    if (!await verifyRequest(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  }

  // req.query.path is the catch-all: undefined | string | string[]
  const pathArr = !req.query.path
    ? []
    : Array.isArray(req.query.path) ? req.query.path : [req.query.path];

  const [resource = '', id = '', sub = ''] = pathArr;
  const method = req.method ?? 'GET';

  try {
    // ── Health ────────────────────────────────────────────────────────────────
    if (!resource || resource === 'health') {
      res.json({ status: 'ok', runtime: 'vercel' }); return;
    }

    // ── Notion mirror ─────────────────────────────────────────────────────────
    // Dry-run is the safe default. This endpoint never writes legacy operational keys.
    if (resource === 'notion-sync' && method === 'POST') {
      const request = await readBody(req);
      const dryRun = request?.dryRun !== false;
      const runId = `notion-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const snapshots: Record<string, any[]> = {};
      let recordsSeen = 0;
      let latestSourceEdit: string | null = null;

      for (const [source, dataSourceId] of Object.entries(NOTION_SOURCES)) {
        const records = await fetchNotionSource(source, dataSourceId);
        snapshots[source] = records;
        recordsSeen += records.length;
        for (const record of records) {
          if (!record.sourceLastEditedAt || (latestSourceEdit && record.sourceLastEditedAt <= latestSourceEdit)) continue;
          latestSourceEdit = record.sourceLastEditedAt;
        }
      }

      const counts = Object.fromEntries(Object.entries(snapshots).map(([source, records]) => [source, records.length]));
      if (!dryRun) {
        for (const [source, records] of Object.entries(snapshots)) {
          await kvSet(`cr8w_notion_mirror_${source}`, JSON.stringify(records));
        }
        await kvSet('cr8w_notion_sync_meta', JSON.stringify({
          source: 'notion',
          mirrorUpdatedAt: new Date().toISOString(),
          sourceLastEditedAt: latestSourceEdit,
          syncRunId: runId,
          counts,
        }));
      }

      res.json({
        ok: true,
        dryRun,
        runId,
        recordsSeen,
        counts,
        latestSourceEdit,
        writes: dryRun ? 0 : Object.keys(snapshots).length + 1,
      });
      return;
    }

    // ── Sync ──────────────────────────────────────────────────────────────────
    if (resource === 'sync' && method === 'GET') {
      const KEYS = [
        'cr8w_tasks','cr8w_stations','cr8w_forum','cr8w_messages',
        'cr8w_braindumps','cr8w_announcements','cr8w_forum_replies',
        'cr8w_workshops','cr8w_workshop_programs','cr8w_workshop_resources',
        'cr8w_coflow_dates','cr8w_coflow_checkins','cr8w_well_notes','cr8w_calendar_events',
        'cr8w_notion_sync_meta',
      ];
      const { data, error } = await sb().from(TABLE).select('key,value').in('key', KEYS);
      if (error) { res.status(500).json({ error: error.message }); return; }
      const m: Record<string, any[]> = {};
      for (const row of data ?? []) if (row.key !== 'cr8w_notion_sync_meta') m[row.key] = parseList(row.value);
      const syncMeta = parseObject(data?.find(row => row.key === 'cr8w_notion_sync_meta')?.value);
      res.json({
        tasks: m['cr8w_tasks']??[], stations: m['cr8w_stations']??[],
        forum: m['cr8w_forum']??[], messages: m['cr8w_messages']??[],
        braindumps: m['cr8w_braindumps']??[], announcements: m['cr8w_announcements']??[],
        forumReplies: m['cr8w_forum_replies']??[], workshops: m['cr8w_workshops']??[],
        workshopPrograms: m['cr8w_workshop_programs']??[], workshopResources: m['cr8w_workshop_resources']??[],
        coflowDates: m['cr8w_coflow_dates']??[], coflowCheckins: m['cr8w_coflow_checkins']??[],
        wellNotes: m['cr8w_well_notes']??[], calendarEvents: m['cr8w_calendar_events']??[],
        freshness: {
          source: syncMeta.source === 'notion' ? 'notion' : 'unknown',
          mirrorUpdatedAt: typeof syncMeta.mirrorUpdatedAt === 'string' ? syncMeta.mirrorUpdatedAt : null,
          sourceLastEditedAt: typeof syncMeta.sourceLastEditedAt === 'string' ? syncMeta.sourceLastEditedAt : null,
          syncRunId: typeof syncMeta.syncRunId === 'string' ? syncMeta.syncRunId : null,
        },
      });
      return;
    }

    // ── Forum replies (nested routes) ─────────────────────────────────────────
    // GET/POST  /forum/:postId/replies
    if (resource === 'forum' && sub === 'replies') {
      const all = await getList('cr8w_forum_replies');
      if (method === 'GET') { res.json(all.filter((r: any) => String(r.postId) === String(id))); return; }
      if (method === 'POST') {
        const b = await readBody(req);
        const reply = { ...b, id: Date.now(), postId: Number(id)||id, created_at: new Date().toISOString() };
        all.push(reply);
        await setList('cr8w_forum_replies', all);
        res.status(201).json(reply); return;
      }
    }
    // GET  /forum/replies/all
    if (resource === 'forum' && id === 'replies' && sub === 'all' && method === 'GET') {
      res.json(await getList('cr8w_forum_replies')); return;
    }
    // DELETE  /forum/replies/:replyId
    if (resource === 'forum' && id === 'replies' && sub && method === 'DELETE') {
      const all = await getList('cr8w_forum_replies');
      await setList('cr8w_forum_replies', all.filter((r: any) => String(r.id) !== sub));
      res.json({ ok: true }); return;
    }

    // ── Invite counts ─────────────────────────────────────────────────────────
    if (resource === 'invite-counts') {
      if (method === 'GET') {
        const raw = await kvGet('cr8w_invite_counts');
        const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
        res.json(parsed ?? { confirmed:0, pending:0, declined:0, maybe:0, total:0 }); return;
      }
      if (method === 'POST') {
        const b = await readBody(req);
        const counts = { confirmed:Number(b.confirmed)||0, pending:Number(b.pending)||0, declined:Number(b.declined)||0, maybe:Number(b.maybe)||0, total:Number(b.total)||0, updated_at: new Date().toISOString() };
        await kvSet('cr8w_invite_counts', JSON.stringify(counts));
        res.json({ ok:true, ...counts }); return;
      }
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    if (resource === 'settings' && id) {
      const sk = `cr8w_settings_${id}`;
      if (method === 'GET') {
        const raw = await kvGet(sk);
        const val = raw ? (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw) : null;
        res.json({ value: val }); return;
      }
      if (method === 'PUT') {
        const b = await readBody(req);
        await kvSet(sk, JSON.stringify(b.value));
        res.json({ ok:true }); return;
      }
    }

    // ── Calendar events ───────────────────────────────────────────────────────
    if (resource === 'calendar-events') {
      if (method === 'GET') { res.json(await getList('cr8w_calendar_events')); return; }
      if (method === 'POST') {
        const b = await readBody(req);
        const evts = Array.isArray(b) ? b : (b.events ?? []);
        const norm = evts.map((ev: any, i: number) => ({
          id: ev.id || `gcal-${Date.now()}-${i}`, title: ev.title||'(No title)',
          start: ev.start||'', end: ev.end||'', location: ev.location||'',
          description: ev.description||'', creator: ev.creator||'',
          synced_at: new Date().toISOString(),
        }));
        await setList('cr8w_calendar_events', norm);
        res.json({ ok:true, count: norm.length }); return;
      }
    }

    // ── Parking lot ───────────────────────────────────────────────────────────
    if (resource === 'parking-lot') {
      if (method === 'GET') { res.json(await getList('cr8w_parking_lot')); return; }
      if (method === 'POST') {
        const b = await readBody(req);
        if (Array.isArray(b)) { await setList('cr8w_parking_lot', b); res.json({ ok:true, count: b.length }); return; }
        const lst = await getList('cr8w_parking_lot');
        const item = { id: b.id||`pl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text:b.text||'', category:b.category||'spark', author:b.author||'monny', created_at:b.created_at||new Date().toISOString() };
        lst.unshift(item);
        await setList('cr8w_parking_lot', lst);
        res.json({ ok:true, item }); return;
      }
      if (method === 'DELETE' && id) {
        const lst = await getList('cr8w_parking_lot');
        await setList('cr8w_parking_lot', lst.filter((x: any) => x.id !== id));
        res.json({ ok:true }); return;
      }
    }


    // ── iCal Calendar Sync ────────────────────────────────────────────────────
    // POST /calendar-ical-sync  — fetches CR8W_ICAL_URL, parses VEVENTs, stores
    if (resource === 'calendar-ical-sync' && method === 'POST') {
      try {
        const result = await syncCalendarIcal(process.env.CR8W_ICAL_URL, {
          fetchCalendar: (url) => fetch(url),
          readValue: kvGet,
          writeValue: kvSet,
        });
        res.json({
          ok: true,
          count: result.events.length,
          events: result.events,
          calendarSync: deriveCalendarSyncState({
            configured: true,
            metadata: result.metadata,
            recordCount: result.events.length,
          }),
        });
        return;
      } catch (error) {
        if (error instanceof CalendarSyncError) {
          console.error('[ical-sync]', error.code);
          res.status(error.httpStatus).json({
            error: error.message,
            errorCode: error.code,
          });
          return;
        }
        console.error('[ical-sync]', 'unknown');
        res.status(500).json({ error: 'Shared calendar sync failed', errorCode: 'unknown' });
        return;
      }
    }

    // ── GCal OAuth token exchange ─────────────────────────────────────────────
    if (resource === 'gcal-token-exchange' && method === 'POST') {
      const { code, code_verifier, redirect_uri, client_id } = await readBody(req);
      if (!code || !redirect_uri || !client_id) { res.status(400).json({ error: 'Missing fields' }); return; }
      const secret = process.env.GCAL_CLIENT_SECRET;
      if (!secret) { res.status(500).json({ error: 'GCAL_CLIENT_SECRET not set' }); return; }
      const params: Record<string, string> = { code, client_id, client_secret: secret, redirect_uri, grant_type: 'authorization_code' };
      if (code_verifier) params.code_verifier = code_verifier;
      const tr = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams(params).toString() });
      const td = await tr.json();
      if (td.error) { res.status(400).json({ error: td.error, error_description: td.error_description }); return; }
      res.json({ access_token: td.access_token, refresh_token: td.refresh_token, expires_in: td.expires_in, token_type: td.token_type, scope: td.scope });
      return;
    }

    // ── Generic list CRUD ─────────────────────────────────────────────────────
    const KV: Record<string, string> = {
      tasks:'cr8w_tasks', stations:'cr8w_stations', forum:'cr8w_forum',
      messages:'cr8w_messages', braindumps:'cr8w_braindumps', announcements:'cr8w_announcements',
      workshops:'cr8w_workshops', 'workshop-programs':'cr8w_workshop_programs',
      'workshop-resources':'cr8w_workshop_resources', 'coflow-dates':'cr8w_coflow_dates',
      'coflow-checkins':'cr8w_coflow_checkins', 'well-notes':'cr8w_well_notes',
    };
    const kvKey = KV[resource];
    if (kvKey) {
      if (method === 'GET' && !id) { res.json(await getList(kvKey)); return; }
      if (method === 'POST' && !id) {
        const b = await readBody(req);
        const list = await getList(kvKey);
        const item = { ...b, id: Date.now(), created_at: new Date().toISOString() };
        if (['forum','braindumps','announcements'].includes(resource)) list.unshift(item);
        else if (resource === 'messages') { list.push(item); if (list.length > 500) list.splice(0, list.length - 500); }
        else list.push(item);
        await setList(kvKey, list);
        res.status(201).json(item); return;
      }
      if (method === 'PUT' && id) {
        const b = await readBody(req);
        const list = await getList(kvKey);
        const idx = list.findIndex((x: any) => String(x.id) === id);
        if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
        list[idx] = { ...list[idx], ...b, id: list[idx].id, updated_at: new Date().toISOString() };
        await setList(kvKey, list);
        res.json(list[idx]); return;
      }
      if (method === 'DELETE' && id) {
        const list = await getList(kvKey);
        await setList(kvKey, list.filter((x: any) => String(x.id) !== id));
        res.json({ ok:true }); return;
      }
    }

    res.status(404).json({ error: `Unknown: ${method} /api/server/${pathArr.join('/')}` });
  } catch (e: any) {
    console.error('[cr8w-api]', e);
    res.status(500).json({ error: e?.message ?? String(e) });
  }
}
