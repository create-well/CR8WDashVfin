---
id: feature-calendar-sync-health-1
title: Shared Google Calendar sync health
status: ready
created: 2026-09-11
design: docs/superpowers/specs/2026-09-11-google-calendar-sync-health-design.md
---

# Shared Google Calendar Sync Health

## Objective

Expose reliable shared Google Calendar configuration and synchronization health
through the existing authenticated dashboard read, preserve last-known-good
events on failed refreshes, and render the state in the live dashboard route.

## Constraints

- Google Calendar remains the write owner; Supabase only mirrors events and
  bounded operational metadata.
- Do not expose the iCal URL, tokens, raw upstream payloads, or environment
  values.
- Do not change Notion synchronization or personal browser-local Google OAuth.
- The active UI path is `ThisWeekPage` -> `HubView`; the unused modular
  `CalendarCard` is not an implementation target.
- A zero-event calendar is a valid successful synchronization.

## Execution

### CAL-001: Define server calendar contracts

**Files:** `api/calendar-sync-health.ts`,
`api/__tests__/calendar-sync-health.test.ts`

Create typed persisted metadata and public state contracts. Add pure
normalization/derivation that treats malformed metadata as never synchronized,
derives configuration from the current environment, derives count from the
current event array, and marks successful data stale after 24 hours. Add tests
for unconfigured, never-synced, malformed, healthy-zero, healthy-nonzero,
stale, and failed states.

### CAL-002: Make the iCal refresh preserve last-known-good data

**Files:** `api/calendar-ical-sync.ts`,
`api/server/[[...path]].ts`,
`api/__tests__/calendar-ical-sync.test.ts`

Extract the refresh operation behind injected fetch and KV writers so it can be
tested without network or Supabase. Record attempt metadata, classify bounded
error codes, reject unusable calendar payloads, write events before success
metadata, and never replace events on fetch or parse failure. Wire the existing
`POST /calendar-ical-sync` route to the helper and return safe errors. Test
success ordering, empty success, missing configuration, fetch failure, parse
failure, and storage failure.

### CAL-003: Extend the authenticated dashboard contract

**Files:** `api/dashboard-sync.ts`,
`api/__tests__/dashboard-sync.test.ts`

Read `cr8w_calendar_sync_meta`, derive `calendarSync` using the event list from
the same database response, and include it beside `calendarEvents`. Keep
malformed metadata non-fatal and preserve current source authorization.

### CAL-004: Centralize frontend shared-calendar refresh

**Files:** `src/app/components/api.ts`,
`src/app/components/__tests__/api.test.ts`

Add shared calendar state types to `SyncData`. Add
`syncSharedCalendar()` through the existing request base and authorization
headers. Test the exact route, method, response, and surfaced API errors.

### CAL-005: Project calendar data through dashboard state

**Files:** `src/types/dashboard.ts`,
`src/contexts/DashboardContext.tsx`,
`src/app/pages/ThisWeekPage.tsx`,
`src/app/components/HubView.tsx`

Project `calendarEvents` and `calendarSync` from `SyncProvider` into
`DashboardPayload`, pass them through the live page, and remove `HubView`'s
separate initial calendar read. After manual refresh, use the refresh response
to update displayed events and state locally until the next dashboard poll.

### CAL-006: Render connector health without conflating retries

**Files:** `src/app/components/SyncStatusBar.tsx`,
`src/app/components/HubView.tsx`,
`src/app/components/__tests__/calendarSyncPresentation.test.ts`

Add pure presentation helpers for concise status labels and warnings. Disable
manual calendar refresh when unconfigured; show never-synced, healthy
zero-event, stale, and failed states while retaining mirrored events. Include
calendar health in `SyncStatusBar` visibility, but show the dashboard Retry
button only for dashboard/Notion problems because it does not trigger a
calendar refresh.

### CAL-007: Validate the complete change

**Files:** `.handoff/CONTEXT.md`, `.handoff/STATE.md`,
`.handoff/NEXT_ACTION.md`, `.handoff/VALIDATION.md`

Run the focused Vitest files, then `pnpm test && pnpm check`. Start Vite and use
a real browser with fixture states to verify unconfigured, never-synced,
healthy-zero, stale, and failed states with no console errors. Update handoff
artifacts with the implementation, verification evidence, and the remaining
operator prerequisite to supply `CR8W_ICAL_URL` securely.

## Completion Criteria

- `calendarSync` is present in authenticated dashboard reads.
- Event data survives all refresh failures.
- The live dashboard route renders every designed state.
- Refresh uses the centralized authenticated API client.
- Targeted tests and the full CI-equivalent gate pass.
- Browser verification covers every visible fixture state.
