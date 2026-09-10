import { expect, test } from '@playwright/test';

const dashboardPayload = {
  tasks: [], stations: [], forum: [], messages: [], braindumps: [], announcements: [],
  forumReplies: [], workshops: [], workshopPrograms: [], workshopResources: [],
  coflowDates: [], coflowCheckins: [], wellNotes: [], calendarEvents: [],
  notionMirrors: {
    people: [], flows: [], moves: [], content: [], money: [],
    engineeringDelivery: [{
      source: 'engineeringDelivery', sourcePageId: 'delivery-1', sourceUrl: null,
      sourceLastEditedAt: '2026-09-10T12:00:00.000Z', archived: false,
      properties: {
        Name: { type: 'title', value: 'Typed mirror rollout', displayValue: 'Typed mirror rollout' },
        Stage: { type: 'select', value: 'Review', displayValue: 'Review' },
        Surface: { type: 'multi_select', value: ['Data/Sync', 'API'], displayValue: 'Data/Sync,API' },
      },
    }],
  },
  notionSources: [{ key: 'engineeringDelivery', label: 'Engineering Delivery', visible: true, searchable: true, sensitivity: 'restricted', displayFields: ['Name', 'Stage'], recordCount: 1 }],
  freshness: {
    source: 'notion', mirrorUpdatedAt: '2026-09-10T12:00:00.000Z', sourceLastEditedAt: '2026-09-10T12:00:00.000Z', syncRunId: 'e2e',
    sourceFreshness: Object.fromEntries(['people', 'flows', 'moves', 'content', 'money', 'engineeringDelivery'].map(source => [source, { status: 'ok', recordCount: source === 'engineeringDelivery' ? 1 : 0, sourceLastEditedAt: '2026-09-10T12:00:00.000Z', lastSuccessfulSyncAt: '2026-09-10T12:00:00.000Z' }])),
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr8w_user_profile', 'monny');
    localStorage.setItem('cr8w_supabase_auth', JSON.stringify({ expires_at: Math.floor(Date.now() / 1000) + 3600 }));
  });
  await page.route('**/api/dashboard-sync', route => {
    const url = new URL(page.url());
    const partialFailure = url.searchParams.get('e2e') === 'partial';
    const staleMirror = url.searchParams.get('e2e') === 'stale';
    const freshness = partialFailure
      ? { ...dashboardPayload.freshness, sourceFreshness: { ...dashboardPayload.freshness.sourceFreshness, engineeringDelivery: { status: 'error', recordCount: 1, sourceLastEditedAt: '2026-09-10T12:00:00.000Z', lastSuccessfulSyncAt: '2026-09-10T11:00:00.000Z', error: 'Notion request failed with status 429' } } }
      : staleMirror
        ? { ...dashboardPayload.freshness, mirrorUpdatedAt: '2026-09-09T12:00:00.000Z' }
        : dashboardPayload.freshness;
    return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ...dashboardPayload, freshness }),
  });
  });
});

test('shows the dashboard and filters typed Engineering Delivery properties', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Team source, visible here' })).toBeVisible();
  await expect(page.getByLabel('Per-source Notion freshness')).toContainText('Engineering Delivery');
  await expect(page.getByLabel('Per-source Notion freshness')).toContainText('Healthy · synced');
  await expect(page.getByRole('button', { name: /Engineering Delivery/ })).toBeVisible();
  await expect(page.getByText('Typed mirror rollout', { exact: true })).toBeVisible();

  await page.getByRole('combobox', { name: 'Filter synchronized records by property' }).selectOption({ label: 'Stage' });
  await page.getByRole('combobox', { name: 'Filter Stage values' }).selectOption({ label: 'Review' });
  await expect(page.getByText('1 matching records', { exact: false })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search synchronized records' }).fill('does-not-match');
  await expect(page.getByText('No synchronized records match these filters.')).toBeVisible();
});

test('renders the sign-in gate without an existing session', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('CR8W Dashboard')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In →', exact: true })).toBeVisible();
  await context.close();
});

test('shows partial-source failure while preserving the last good mirror data', async ({ page }) => {
  await page.goto('/?e2e=partial');
  await expect(page.getByRole('status')).toContainText('Some sources failed; showing last good data');
  await expect(page.getByLabel('Per-source Notion freshness')).toContainText('Sync error · last good');
  await expect(page.getByText('Typed mirror rollout', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

test('shows the mirror stale indicator when freshness is beyond the threshold', async ({ page }) => {
  await page.goto('/?e2e=stale');
  await expect(page.getByRole('status')).toContainText('Mirror stale');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});
