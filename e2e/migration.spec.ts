import { expect, test } from '@playwright/test';

const dashboardPayload = {
  tasks: [], stations: [], forum: [], messages: [], braindumps: [], announcements: [],
  forumReplies: [], workshops: [], workshopPrograms: [], workshopResources: [],
  coflowDates: [{ id: 1, date: '2099-09-11', timeRange: '6:00 PM – 7:00 PM', location: 'The Well', host: 'monny', rsvp: {}, agendaItems: [], notes: '', vibeCheck: '', status: 'upcoming' }, { id: 2, date: '2099-09-12', timeRange: '6:00 PM – 7:00 PM', location: 'The Well', host: 'sunshine', rsvp: {}, agendaItems: [], notes: '', vibeCheck: '', status: 'upcoming' }], coflowCheckins: [], wellNotes: [], calendarEvents: [],
  notionMirrors: { people: [], flows: [], moves: [], content: [], money: [], engineeringDelivery: [] },
  notionSources: [],
  freshness: { source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: 'migration-e2e' },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cr8w_user_profile', 'migration-test');
    localStorage.setItem('cr8w_supabase_auth', JSON.stringify({ expires_at: Math.floor(Date.now() / 1000) + 3600 }));
  });
  await page.route('**/api/dashboard-sync', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(dashboardPayload),
  }));
});

test('resolves the lazy home route after the Suspense fallback', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Team source, visible here' })).toBeVisible();
  await expect(page.getByText('Loading…')).toBeHidden();
});

test('resolves each lazy page route through the shared route manifest', async ({ page }) => {
  const routes = [
    ['/moves', 'Moves'],
    ['/care', 'Care'],
    ['/flows', 'Flows'],
    ['/money', 'Money'],
    ['/decisions', 'Decisions'],
    ['/system', 'System'],
  ] as const;

  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('body')).toContainText(new RegExp(heading, 'i'), { timeout: 15000 });
  }
});

test('mounts the first CoFlow feature slice on the lazy Care route', async ({ page }) => {
  await page.goto('/care');
  await expect(page.getByText('Also On Deck').first()).toBeVisible();
  await expect(page.getByText('Saturday, September 12')).toBeVisible();
});
