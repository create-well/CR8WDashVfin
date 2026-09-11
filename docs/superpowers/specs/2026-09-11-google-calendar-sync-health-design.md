# Google Calendar Sync Health Design

## Goal

Make the CR8W dashboard accurately report whether the shared Google Calendar
mirror is configured, healthy, stale, or failing. Preserve the ownership rule:
Google Calendar owns calendar events, Supabase remembers the latest mirror and
sync metadata, and cr8w.com reads the result.

This is the first bounded milestone within the broader backend-sync objective.
The existing Notion pipeline is already production-ready and remains unchanged.

## Success Conditions

- The authenticated dashboard payload distinguishes these states:
  - the shared calendar connector is not configured;
  - a sync is configured but has never completed;
  - the latest sync succeeded with zero or more events;
  - the latest sync failed while last-known-good events remain readable;
  - the last successful sync is stale.
- The shared-calendar UI communicates those states without inferring health
  from event count.
- A failed refresh never replaces last-known-good calendar events with an empty
  success-shaped response.
- Personal Google OAuth remains a separate browser-local feature.
- Contract tests, focused component tests, the production build, and a browser
  fixture check prove the behavior.

## Considered Approaches

### 1. Extend the existing dashboard sync payload (selected)

Store shared-calendar sync metadata beside the existing calendar event mirror
and return it from the authenticated dashboard endpoint.

This keeps one frontend polling lifecycle, makes zero-event success explicit,
and is the smallest reliable addition to the current architecture.

### 2. Infer status from event timestamps

Derive health from `calendarEvents[].synced_at`.

This requires less server work, but it cannot distinguish an empty healthy
calendar from a missing connector or a failed first sync. It is rejected
because those ambiguous states are the core problem.

### 3. Add a dedicated integration-health endpoint

Create a new authenticated endpoint and polling path for connector health.

This could scale to many integrations, but the repository currently has one
shared server-side Google connector. The extra request and lifecycle are not
justified yet. The payload contract below can later be moved behind a dedicated
endpoint without changing its semantics.

## Architecture

### Supabase keys

Keep `cr8w_calendar_events` as the last-known-good shared-calendar mirror. Add
`cr8w_calendar_sync_meta` for non-secret operational metadata:

```ts
interface CalendarSyncMetadata {
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastOutcome: 'ok' | 'error';
  errorCode?: 'fetch_failed' | 'parse_failed' | 'storage_failed' | 'unknown';
}
```

The authenticated dashboard response derives the public connector contract:

```ts
interface CalendarSyncState {
  configured: boolean;
  status: 'not_configured' | 'never_synced' | 'ok' | 'error';
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  recordCount: number;
  stale: boolean;
  errorCode?: CalendarSyncMetadata['errorCode'];
}
```

`configured` comes from the current server environment, `recordCount` comes
from the event mirror returned in the same response, and `stale` is true when
the last successful sync is more than 24 hours old. These derived fields are
not persisted and therefore cannot drift from runtime configuration or events.

The metadata must never contain the iCal URL, Google tokens, raw upstream
responses, or credential-derived details.

### iCal sync route

`POST /api/server/calendar-ical-sync` remains the only server-side refresh
entry point.

1. Record an attempt timestamp.
2. If `CR8W_ICAL_URL` is absent, return a configuration error and expose
   `not_configured` from the read contract. Do not write event data.
3. Fetch and parse the upstream iCal feed.
4. Only after a complete successful parse, write the event list and successful
   metadata.
5. On fetch, parse, or storage failure, preserve the existing event mirror and
   write sanitized error metadata when storage is available.

The event and metadata writes do not need a new database or source of truth.
If the existing KV adapter cannot transactionally update both keys, write the
event mirror first and success metadata second. Readers then see either the
previous complete state or the new complete state; metadata must never claim a
new success before its events are stored.

### Dashboard read contract

`GET /api/dashboard-sync` continues to be the frontend's single authenticated
read. Add `calendarSync` beside `calendarEvents`.

The handler derives `configured` from server configuration on every request,
derives `recordCount` from the event mirror, and combines both with sanitized
stored metadata. Missing or malformed metadata must produce `never_synced` when
configured and `not_configured` otherwise. Malformed metadata must not throw
away readable calendar events.

### Frontend behavior

Add `calendarSync` to the shared TypeScript contract.

`SyncStatusBar` remains quiet only when dashboard fetch, Notion mirror, Notion
sources, and configured shared-calendar sync are healthy. It shows a concise
calendar warning for `not_configured`, `never_synced`, `error`, or stale
success. The existing Retry button still retries the dashboard read; it must
not imply that it triggers the protected calendar refresh.

`CalendarCard` displays connector state near the shared-calendar controls:

- `not_configured`: explain that the calendar owner must provide the secret
  iCal address; disable the refresh button.
- `never_synced`: allow refresh and label the state as awaiting first sync.
- `ok`: show the last successful relative time, including a valid zero-event
  result.
- `error`: keep rendering last-known-good events and show that the latest
  refresh failed.
- stale `ok`: show the last successful time with a stale warning.

The shared-calendar refresh uses the existing authenticated API client rather
than duplicating hostname and authorization logic in the component. Personal
Google OAuth, personal event visibility, and token storage are out of scope.

## Error Handling

- Upstream HTTP failures map to `fetch_failed`.
- Invalid or unusable calendar data maps to `parse_failed`.
- KV write failures map to `storage_failed` when they can be recorded safely.
- Unexpected failures map to `unknown`.
- API responses may include a user-safe message, but stored metadata and
  dashboard payloads expose only the bounded error code.
- No failure path overwrites `cr8w_calendar_events` with an empty array.
- An authentically empty calendar is a successful sync with `recordCount: 0`.

## Validation Loop

1. API contract tests cover missing, malformed, successful-zero, successful
   nonzero, stale, and failed metadata.
2. Route tests prove successful refresh ordering and last-known-good
   preservation on fetch and parse failure.
3. Component tests cover disabled unconfigured refresh, zero-event healthy
   status, stale status, and failed-refresh messaging.
4. Run focused Vitest files, `pnpm typecheck`, and `pnpm build`.
5. Run the dashboard with fixture responses and verify the four user-visible
   states in a real browser, including console errors.

Production configuration remains a human-owned prerequisite. This milestone is
complete in code when all fixture states pass; live connected status is complete
only after the calendar owner supplies `CR8W_ICAL_URL` through the approved
Vercel secret workflow and a real refresh succeeds.

## Scope Boundaries

- No Notion data or schema changes.
- No Google Calendar writes.
- No new database.
- No credential rotation or secret inspection.
- No redesign of personal Google OAuth.
- No generic multi-integration framework until another server-side connector
  needs the same contract.
