import assert from 'node:assert/strict';

const base = process.env.CR8W_PROD_API_URL ?? 'https://cr8w-dash-vfin.vercel.app/api/server';
const key = process.env.CR8W_PROD_PUBLIC_KEY;
assert.ok(key, 'CR8W_PROD_PUBLIC_KEY must be provided by CI secrets');

const routeShapes = new Map([
  ['health', body => assert.equal(body.status, 'ok')],
  ['sync', body => {
    for (const key of ['tasks', 'stations', 'forum', 'messages', 'braindumps', 'announcements', 'forumReplies', 'workshops', 'workshopPrograms', 'workshopResources', 'coflowDates', 'coflowCheckins', 'wellNotes', 'calendarEvents']) assert.ok(Array.isArray(body[key]), `sync.${key} must be an array`);
  }],
  ['tasks', body => assert.ok(Array.isArray(body))],
  ['stations', body => assert.ok(Array.isArray(body))],
  ['forum', body => assert.ok(Array.isArray(body))],
  ['messages', body => assert.ok(Array.isArray(body))],
  ['braindumps', body => assert.ok(Array.isArray(body))],
  ['announcements', body => assert.ok(Array.isArray(body))],
  ['workshops', body => assert.ok(Array.isArray(body))],
  ['workshop-programs', body => assert.ok(Array.isArray(body))],
  ['workshop-resources', body => assert.ok(Array.isArray(body))],
  ['coflow-dates', body => assert.ok(Array.isArray(body))],
  ['coflow-checkins', body => assert.ok(Array.isArray(body))],
  ['well-notes', body => assert.ok(Array.isArray(body))],
  ['calendar-events', body => assert.ok(Array.isArray(body))],
  ['invite-counts', body => {
    for (const key of ['confirmed', 'pending', 'declined', 'maybe', 'total']) assert.equal(typeof body[key], 'number', `invite-counts.${key} must be numeric`);
  }],
  ['parking-lot', body => assert.ok(Array.isArray(body))],
  ['forum/replies/all', body => assert.ok(Array.isArray(body))],
  ['notion-sync-runs&limit=10', body => {
    assert.ok(Array.isArray(body.runs));
    assert.ok(body.runs.length <= 10);
  }],
]);

const routes = [...routeShapes.keys()];

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
  routeShapes.get(route)(result.body);
  results.push({ route, status: result.response.status });
}

const sync = await probe('sync');
assert.ok(Array.isArray(sync.body.calendarEvents));

const syncRuns = await probe('notion-sync-runs&limit=10');
routeShapes.get('notion-sync-runs&limit=10')(syncRuns.body);

const unauthorized = await probe('sync', false);
assert.equal(unauthorized.response.status, 401);

console.log(JSON.stringify({
  passedRoutes: results.length,
  unauthorizedSyncStatus: unauthorized.response.status,
  calendarEventCount: sync.body.calendarEvents.length,
  notionSyncRunCount: syncRuns.body.runs.length,
}, null, 2));
