import assert from 'node:assert/strict';

const base = process.env.CR8W_PROD_BASE_URL ?? 'https://www.cr8w.com';
const unauthorized = await fetch(`${base}/api/notion-sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: true }) });
assert.equal(unauthorized.status, 401, `notion-sync without operator token returned ${unauthorized.status}`);
const dashboard = await fetch(`${base}/api/dashboard-sync`);
assert.equal(dashboard.status, 200, `dashboard-sync returned ${dashboard.status}`);
const body = await dashboard.json();
assert.ok(body && typeof body === 'object', 'dashboard-sync response must be an object');
assert.ok(body.freshness && typeof body.freshness === 'object', 'dashboard-sync must expose freshness');
console.log(JSON.stringify({ unauthorizedNotionSyncStatus: unauthorized.status, dashboardStatus: dashboard.status, generationId: body.freshness.generationId ?? null }, null, 2));
