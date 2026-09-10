/**
 * CR8W Create Well — Vercel API handler
 * Single catch-all route that replaces the Supabase edge function.
 * All data persisted in Supabase PostgreSQL via the kv_store_8dcd9693 table.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────────
function supabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

const TABLE = 'kv_store_8dcd9693';

// ── KV helpers ────────────────────────────────────────────────────────────────
async function kvGet(key: string): Promise<any> {
  const { data, error } = await supabase().from(TABLE).select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase().from(TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
}

function parseList(raw: any): any[] {
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []; }
  catch { return []; }
}

async function getList(key: string): Promise<any[]> {
  return parseList(await kvGet(key));
}

async function setList(key: string, list: any[]): Promise<void> {
  await kvSet(key, JSON.stringify(list));
}

const NOTION_SOURCES = {
  people: 'b97bcbdf-2b1b-488d-9d07-4012b031732e',
  flows: 'c1677843-dd13-4e37-9f80-e960b26847dc',
  moves: '5597e583-f7df-4f6c-90b0-296a26c57454',
  content: 'cd410d33-8052-4897-8226-3a3ca84ea8bc',
  money: '55832c19-38fa-44cb-b4c2-0174b4c5b207',
} as const;

function notionValue(property: any): unknown {
  if (!property || !property.type) return null;
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') return (value ?? []).map((item: any) => item.plain_text ?? item.text?.content ?? '').join('');
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
  return {
    source,
    sourcePageId: page.id,
    sourceUrl: page.url ?? null,
    sourceLastEditedAt: page.last_edited_time ?? null,
    archived: Boolean(page.archived),
    properties: Object.fromEntries(Object.entries(page.properties ?? {}).map(([name, property]) => [name, notionValue(property)])),
  };
}

async function notionRequest(path: string, options: RequestInit = {}): Promise<any> {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('Missing NOTION_API_KEY');
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json', ...(options.headers ?? {}) },
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

function canRunNotionSync(req: VercelRequest): boolean {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  return Boolean(token && expected && token === expected);
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function cors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Body parser ───────────────────────────────────────────────────────────────
function body(req: VercelRequest): Promise<any> {
  return new Promise((resolve) => {
    if (req.body) { resolve(req.body); return; }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

// ── Route dispatcher ─────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Resolve path: /api/server/sync → "sync"; /api/server/tasks/123 → "tasks/123"
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path.join('/')
    : (req.query.path as string) ?? '';

  const segments = rawPath.split('/').filter(Boolean);
  const [resource, id, sub, subId] = segments;
  const method = req.method ?? 'GET';

  try {
    // ── Health ────────────────────────────────────────────────────────────────
    if (resource === 'health') {
      res.json({ status: 'ok', runtime: 'vercel' }); return;
    }

    if (resource === 'notion-sync' && method === 'POST') {
      if (!canRunNotionSync(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const request = await body(req);
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
          if (record.sourceLastEditedAt && (!latestSourceEdit || record.sourceLastEditedAt > latestSourceEdit)) latestSourceEdit = record.sourceLastEditedAt;
        }
      }

      const counts = Object.fromEntries(Object.entries(snapshots).map(([source, records]) => [source, records.length]));
      if (!dryRun) {
        for (const [source, records] of Object.entries(snapshots)) await kvSet(`cr8w_notion_mirror_${source}`, JSON.stringify(records));
        await kvSet('cr8w_notion_sync_meta', JSON.stringify({ source: 'notion', mirrorUpdatedAt: new Date().toISOString(), sourceLastEditedAt: latestSourceEdit, syncRunId: runId, counts }));
      }
      res.json({ ok: true, dryRun, runId, recordsSeen, counts, latestSourceEdit, writes: dryRun ? 0 : Object.keys(snapshots).length + 1 }); return;
    }

    // ── Sync ──────────────────────────────────────────────────────────────────
    if (resource === 'sync' && method === 'GET') {
      const SYNC_KEYS = [
        'cr8w_tasks', 'cr8w_stations', 'cr8w_forum', 'cr8w_messages',
        'cr8w_braindumps', 'cr8w_announcements', 'cr8w_forum_replies',
        'cr8w_workshops', 'cr8w_workshop_programs', 'cr8w_workshop_resources',
        'cr8w_coflow_dates', 'cr8w_coflow_checkins', 'cr8w_well_notes',
        'cr8w_calendar_events', 'cr8w_notion_sync_meta',
      ];
      const sb = supabase();
      const { data, error } = await sb.from(TABLE).select('key,value').in('key', SYNC_KEYS);
      if (error) { res.status(500).json({ error: error.message }); return; }
      const map: Record<string, any[]> = {};
      for (const row of data ?? []) if (row.key !== 'cr8w_notion_sync_meta') map[row.key] = parseList(row.value);
      const syncMeta = data?.find(row => row.key === 'cr8w_notion_sync_meta')?.value;
      const freshness = syncMeta ? (typeof syncMeta === 'string' ? JSON.parse(syncMeta) : syncMeta) : {};
      res.json({
        tasks: map['cr8w_tasks'] ?? [],
        stations: map['cr8w_stations'] ?? [],
        forum: map['cr8w_forum'] ?? [],
        messages: map['cr8w_messages'] ?? [],
        braindumps: map['cr8w_braindumps'] ?? [],
        announcements: map['cr8w_announcements'] ?? [],
        forumReplies: map['cr8w_forum_replies'] ?? [],
        workshops: map['cr8w_workshops'] ?? [],
        workshopPrograms: map['cr8w_workshop_programs'] ?? [],
        workshopResources: map['cr8w_workshop_resources'] ?? [],
        coflowDates: map['cr8w_coflow_dates'] ?? [],
        coflowCheckins: map['cr8w_coflow_checkins'] ?? [],
        wellNotes: map['cr8w_well_notes'] ?? [],
        calendarEvents: map['cr8w_calendar_events'] ?? [],
        freshness: {
          source: freshness.source === 'notion' ? 'notion' : 'unknown',
          mirrorUpdatedAt: typeof freshness.mirrorUpdatedAt === 'string' ? freshness.mirrorUpdatedAt : null,
          sourceLastEditedAt: typeof freshness.sourceLastEditedAt === 'string' ? freshness.sourceLastEditedAt : null,
          syncRunId: typeof freshness.syncRunId === 'string' ? freshness.syncRunId : null,
        },
      });
      return;
    }

    // ── Generic CRUD for list resources ───────────────────────────────────────
    const KV_MAP: Record<string, string> = {
      tasks: 'cr8w_tasks',
      stations: 'cr8w_stations',
      forum: 'cr8w_forum',
      messages: 'cr8w_messages',
      braindumps: 'cr8w_braindumps',
      announcements: 'cr8w_announcements',
      workshops: 'cr8w_workshops',
      'workshop-programs': 'cr8w_workshop_programs',
      'workshop-resources': 'cr8w_workshop_resources',
      'coflow-dates': 'cr8w_coflow_dates',
      'coflow-checkins': 'cr8w_coflow_checkins',
      'well-notes': 'cr8w_well_notes',
    };

    // ── Forum replies (nested: /forum/:id/replies[/:replyId]) ─────────────────
    if (resource === 'forum' && sub === 'replies') {
      const postId = id;
      if (method === 'GET') {
        const all = await getList('cr8w_forum_replies');
        res.json(all.filter((r: any) => String(r.postId) === String(postId)));
        return;
      }
      if (method === 'POST') {
        const b = await body(req);
        const all = await getList('cr8w_forum_replies');
        const newReply = { ...b, id: Date.now(), postId: Number(postId) || postId, created_at: new Date().toISOString() };
        all.push(newReply);
        await setList('cr8w_forum_replies', all);
        res.status(201).json(newReply);
        return;
      }
    }

    // GET all forum replies
    if (resource === 'forum' && id === 'replies' && sub === 'all' && method === 'GET') {
      res.json(await getList('cr8w_forum_replies')); return;
    }

    // DELETE a forum reply by replyId: /forum/replies/:replyId
    if (resource === 'forum' && id === 'replies' && sub && method === 'DELETE') {
      const all = await getList('cr8w_forum_replies');
      await setList('cr8w_forum_replies', all.filter((r: any) => String(r.id) !== String(sub)));
      res.json({ ok: true }); return;
    }

    // ── Invite counts ─────────────────────────────────────────────────────────
    if (resource === 'invite-counts') {
      if (method === 'GET') {
        const raw = await kvGet('cr8w_invite_counts');
        res.json(raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : { confirmed: 0, pending: 0, declined: 0, maybe: 0, total: 0 });
        return;
      }
      if (method === 'POST') {
        const b = await body(req);
        const counts = { confirmed: Number(b.confirmed)||0, pending: Number(b.pending)||0, declined: Number(b.declined)||0, maybe: Number(b.maybe)||0, total: Number(b.total)||0, updated_at: new Date().toISOString() };
        await kvSet('cr8w_invite_counts', JSON.stringify(counts));
        res.json({ ok: true, ...counts }); return;
      }
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    if (resource === 'settings' && id) {
      const sk = `cr8w_settings_${id}`;
      if (method === 'GET') {
        const raw = await kvGet(sk);
        res.json({ value: raw ? (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw) : null });
        return;
      }
      if (method === 'PUT') {
        const b = await body(req);
        await kvSet(sk, JSON.stringify(b.value));
        res.json({ ok: true }); return;
      }
    }

    // ── Calendar events ───────────────────────────────────────────────────────
    if (resource === 'calendar-events') {
      if (method === 'GET') { res.json(await getList('cr8w_calendar_events')); return; }
      if (method === 'POST') {
        const b = await body(req);
        const events = Array.isArray(b) ? b : (b.events ?? []);
        const normalized = events.map((ev: any, i: number) => ({
          id: ev.id || `gcal-${Date.now()}-${i}`,
          title: ev.title || '(No title)',
          start: ev.start || '',
          end: ev.end || '',
          location: ev.location || '',
          description: ev.description || '',
          creator: ev.creator || '',
          synced_at: new Date().toISOString(),
        }));
        await setList('cr8w_calendar_events', normalized);
        res.json({ ok: true, count: normalized.length }); return;
      }
    }

    // ── Parking lot ───────────────────────────────────────────────────────────
    if (resource === 'parking-lot') {
      if (method === 'GET') { res.json(await getList('cr8w_parking_lot')); return; }
      if (method === 'POST') {
        const b = await body(req);
        if (Array.isArray(b)) { await setList('cr8w_parking_lot', b); res.json({ ok: true, count: b.length }); return; }
        const existing = await getList('cr8w_parking_lot');
        const item = { id: b.id || `pl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: b.text||'', category: b.category||'spark', author: b.author||'monny', created_at: b.created_at||new Date().toISOString() };
        existing.unshift(item);
        await setList('cr8w_parking_lot', existing);
        res.json({ ok: true, item }); return;
      }
      if (method === 'DELETE' && id) {
        const existing = await getList('cr8w_parking_lot');
        await setList('cr8w_parking_lot', existing.filter((i: any) => i.id !== id));
        res.json({ ok: true }); return;
      }
    }

    // ── Google Calendar OAuth token exchange ──────────────────────────────────
    if (resource === 'gcal-token-exchange' && method === 'POST') {
      const { code, code_verifier, redirect_uri, client_id } = await body(req);
      if (!code || !redirect_uri || !client_id) { res.status(400).json({ error: 'Missing required fields' }); return; }
      const clientSecret = process.env.GCAL_CLIENT_SECRET;
      if (!clientSecret) { res.status(500).json({ error: 'GCAL_CLIENT_SECRET not configured' }); return; }
      const params: Record<string, string> = { code, client_id, client_secret: clientSecret, redirect_uri, grant_type: 'authorization_code' };
      if (code_verifier) params.code_verifier = code_verifier;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) { res.status(400).json({ error: tokenData.error, error_description: tokenData.error_description }); return; }
      res.json({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_in: tokenData.expires_in, token_type: tokenData.token_type, scope: tokenData.scope });
      return;
    }

    // ── Generic list CRUD (GET all / POST new / PUT :id / DELETE :id) ─────────
    const kvKey = KV_MAP[resource];
    if (kvKey) {
      if (method === 'GET' && !id) {
        res.json(await getList(kvKey)); return;
      }
      if (method === 'POST' && !id) {
        const b = await body(req);
        const list = await getList(kvKey);
        const item = { ...b, id: Date.now(), created_at: new Date().toISOString() };
        // Forum and messages prepend; others append
        if (resource === 'forum' || resource === 'braindumps' || resource === 'announcements') list.unshift(item);
        else if (resource === 'messages') { list.push(item); if (list.length > 500) list.splice(0, list.length - 500); }
        else list.push(item);
        await setList(kvKey, list);
        res.status(201).json(item); return;
      }
      if (method === 'PUT' && id) {
        const b = await body(req);
        const list = await getList(kvKey);
        const idx = list.findIndex((x: any) => String(x.id) === String(id));
        if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
        list[idx] = { ...list[idx], ...b, id: list[idx].id, updated_at: new Date().toISOString() };
        await setList(kvKey, list);
        res.json(list[idx]); return;
      }
      if (method === 'DELETE' && id) {
        const list = await getList(kvKey);
        await setList(kvKey, list.filter((x: any) => String(x.id) !== String(id)));
        res.json({ ok: true }); return;
      }
    }

    // ── 404 fallback ──────────────────────────────────────────────────────────
    res.status(404).json({ error: `Unknown route: ${method} /${rawPath}` });
  } catch (e: any) {
    console.error('API error:', e);
    res.status(500).json({ error: e?.message ?? String(e) });
  }
}
