import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const readOptional = async (file) => {
  try { return await read(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

const [routes, rootLayout, topNav, viewShell, dashboardTypes, permissions, context, care, source, decisions, system] = await Promise.all([
  read('src/app/routes.ts'),
  read('src/app/RootLayout.tsx'),
  read('src/app/components/TopNav.tsx'),
  read('src/app/components/ViewShell.tsx'),
  read('src/types/dashboard.ts'),
  read('src/lib/dashboardPermissions.ts'),
  read('src/contexts/DashboardContext.tsx'),
  read('src/app/pages/CarePage.tsx'),
  read('src/app/pages/MoneyPage.tsx'),
  read('src/app/pages/DecisionsPage.tsx'),
  read('src/app/pages/SystemPage.tsx'),
]);
const canonicalApi = await read('api/server/[[...path]].ts');
const legacyApi = await readOptional('api/server.ts');

const pageSources = await Promise.all([
  care,
  source,
  decisions,
  system,
  read('src/app/pages/ThisWeekPage.tsx'),
  read('src/app/pages/MovesPage.tsx'),
  read('src/app/pages/FlowsPage.tsx'),
]);

test('declares the seven required dashboard routes and preserves the Source alias', () => {
  for (const path of ['moves', 'care', 'flows', 'money', 'decisions', 'system']) {
    assert.match(routes, new RegExp(`path:\\s*['"]${path}['"]`));
  }
  assert.match(routes, /\{ index:\s*true/);
  assert.match(routes, /path:\s*'source'.*Component:\s*MoneyPage/);
  assert.match(topNav, /label:\s*'This Week'/);
  assert.match(topNav, /label:\s*'Moves'/);
  assert.match(topNav, /label:\s*'Care'/);
  assert.match(topNav, /label:\s*'The Source'/);
  assert.match(topNav, /label:\s*'Decisions'/);
  assert.match(topNav, /label:\s*'System'/);
});

test('keeps the shared shell composition intact', () => {
  assert.match(rootLayout, /<TopNav/);
  assert.match(rootLayout, /<SyncStatusBar/);
  assert.match(rootLayout, /<Outlet/);
});

test('covers the complete six-condition ViewShell contract', () => {
  for (const state of ['loading', 'empty', 'ready', 'stale', 'failed', 'restricted']) {
    assert.match(viewShell, new RegExp(`['"]${state}['"]`));
  }
  assert.match(viewShell, /Retry sync/);
  assert.match(viewShell, /Data may be stale/);
  assert.match(viewShell, /Access restricted/);
});

test('uses typed Source Flow permission data and names the complete steward roster', () => {
  assert.match(dashboardTypes, /canViewSourceFlow:\s*boolean/);
  assert.match(dashboardTypes, /sourceFlowStewards:\s*readonly string\[\]/);
  assert.match(permissions, /SOURCE_FLOW_STEWARDS/);
  for (const steward of ['monny', 'sunshine', 'bingle', 'omar', 'pia']) {
    assert.match(permissions, new RegExp(`['"]${steward}['"]`));
  }
  assert.match(permissions, /trim\(\)\.toLowerCase\(\)/);
  assert.match(context, /canViewSourceFlow:\s*canStewardSourceFlow\(initialProfile\)/);
  assert.doesNotMatch(context, /canViewSourceFlow:\s*canStewardSourceFlow\(chatActiveUser\)/);
  assert.match(context, /chatActiveUser may be a remapped display identity/);
  assert.match(context, /careConsent:\s*false/);
});

test('uses The Source and Source Flow language while retaining clear local-preview limits', () => {
  assert.match(source, /The Source/);
  assert.match(source, /Source Flow/);
  assert.match(source, /Conditions of flow/);
  assert.match(source, /typed live-data adapter is approved/);
  assert.doesNotMatch(source, /Money, Real Only/);
  assert.match(source, /Pia’s Source Flow tending is consent-aware/);
});

test('enforces the Care consent boundary in user-facing copy', () => {
  assert.match(care, /Care Loop — consent required/);
  assert.match(care, /explicit consent is confirmed/);
  assert.match(care, /careConsent/);
  assert.match(care, /restricted/);
});

test('provides detailed Decisions and System surfaces with recovery and consent context', () => {
  for (const label of ['Add decision', 'Decide', 'Defer', 'Nothing needs deciding right now', 'How we decide']) {
    assert.match(decisions, new RegExp(label));
  }
  assert.match(decisions, /Pia’s Care and Source Flow tending remains consent-aware/);
  for (const label of ['System Health', 'Data sync', 'Registered routes', 'Source Flow visibility', 'Data layer', 'Retry sync']) {
    assert.match(system, new RegExp(label));
  }
  assert.match(system, /Host-provided; no direct service calls from pages/);
});

test('deploys one canonical API handler and fails closed when publishable auth is unconfigured', () => {
  assert.equal(legacyApi, null);
  assert.match(canonicalApi, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(canonicalApi, /SUPABASE_SECRET_KEY/);
  assert.match(canonicalApi, /if \(!pubKey\) return false/);
  assert.doesNotMatch(canonicalApi, /return !pubKey/);
});

test('keeps every dashboard page behind the context boundary without direct service calls', () => {
  for (const page of pageSources) {
    assert.match(page, /useDashboard/);
    assert.doesNotMatch(page, /from ['"][^'"]*(supabase|api)[^'"]*['"]/i);
    assert.doesNotMatch(page, /\bfetch\s*\(/);
  }
});
