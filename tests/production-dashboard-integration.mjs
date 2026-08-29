import assert from 'node:assert/strict';

const base = process.env.CR8W_PROD_API_URL ?? 'https://cr8w-dash-vfin.vercel.app/api/server';
const key = process.env.CR8W_PROD_PUBLIC_KEY;
assert.ok(key, 'CR8W_PROD_PUBLIC_KEY must be provided by CI secrets');

const routes = [
  'health', 'sync', 'tasks', 'stations', 'forum', 'messages', 'braindumps',
  'announcements', 'workshops', 'workshop-programs', 'workshop-resources',
  'coflow-dates', 'coflow-checkins', 'well-notes', 'calendar-events',
  'invite-counts', 'parking-lot', 'forum/replies/all', 'notion-sync-runs&limit=10',
];

async function probe(route, authenticated = route !== 'health') {
  const response = await fetch(`${base}?path=${route}`, {
    headers: authenticated ? { Authorization: `Bearer ${key}` } : {},
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { route, response, body };
}

const results = [];
for (const route of routes) {
  const result = await probe(route);
  assert.equal(result.response.status, 200, `${route} returned ${result.response.status}`);
  results.push({ route, status: result.response.status });
}

const sync = await probe('sync');
assert.ok(Array.isArray(sync.body.calendarEvents));

const syncRuns = await probe('notion-sync-runs&limit=10');
assert.ok(Array.isArray(syncRuns.body.runs));
assert.ok(syncRuns.body.runs.length <= 10);

const unauthorized = await probe('sync', false);
assert.equal(unauthorized.response.status, 401);

console.log(JSON.stringify({
  passedRoutes: results.length,
  unauthorizedSyncStatus: unauthorized.response.status,
  calendarEventCount: sync.body.calendarEvents.length,
  notionSyncRunCount: syncRuns.body.runs.length,
}, null, 2));
