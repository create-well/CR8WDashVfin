import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

const [flowsPage, topNav, routes] = await Promise.all([
  read('src/app/pages/FlowsPage.tsx'),
  read('src/app/components/TopNav.tsx'),
  read('src/app/routes.ts'),
]);

test('keeps the flows route lazily loaded', () => {
  assert.match(routes, /path:\s*'flows'.*lazy:\s*\(\)\s*=>\s*import\('\.\/pages\/FlowsPage'\)/s);
});

test('mounts WorkshopsView through the dashboard context with an empty-state guard', () => {
  assert.match(flowsPage, /useDashboard/);
  assert.match(flowsPage, /const workshops = data\.workshops \?\? \[\];/);
  assert.match(flowsPage, /const programs = data\.workshopPrograms \?\? \[\];/);
  assert.match(flowsPage, /const resources = data\.workshopResources \?\? \[\];/);
  assert.match(flowsPage, /\(workshops\.length === 0 && programs\.length === 0\) \? 'empty' : 'ready'/);
  assert.match(flowsPage, /<WorkshopsView/);
  assert.match(flowsPage, /emptyTitle="No FLOWS yet"/);
});

test('exposes FLOWS in the top navigation without disturbing the existing items', () => {
  assert.match(topNav, /\{ path: '\/flows',\s+label: 'FLOWS',\s+emoji: '🛠️' \}/);
});
