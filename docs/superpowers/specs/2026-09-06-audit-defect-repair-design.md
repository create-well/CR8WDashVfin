# Audit Defect Repair Design

## Scope

Repair the high-confidence defects introduced on
`fix/audit-defects-flows-geyser-calendar`:

1. The Vercel `/sync` handler reads KV rows but returns empty collections.
2. The Notion worker does not paginate or resume, so records beyond the first
   bounded query are never mirrored.
3. Dashboard freshness reads target `mirror_sync_runs`, while the worker and
   migration own `notion_sync_runs`, and the browser defaults to a different
   API boundary.

The repair must preserve Notion as the source of truth, Supabase as the
server-side mirror, last-known-good dashboard data, existing authorization
gates, and the `VITE_API_BASE` escape hatch.

## Architecture

The Vercel handler at `api/server.ts` is the canonical browser API. The client
defaults to same-origin `/api/server` and continues to accept `VITE_API_BASE`
as an explicit override for local or alternate environments. Page components
continue to consume data only through `DashboardContext`.

The server-only Notion worker owns these control-plane tables:

- `notion_sync_records`
- `notion_sync_checkpoints`
- `notion_sync_dead_letters`
- `notion_sync_runs`

The Vercel `/sync` response exposes the latest worker status through
`mirrorLastWrite` and `mirrorStatus`. The `/notion-sync-runs` route exposes
bounded, newest-first run history from `notion_sync_runs`.

## Dashboard Sync Repair

After the KV query succeeds, the Vercel handler parses every returned row into
the response map before constructing the JSON payload. A successful KV read
therefore cannot silently replace populated dashboard collections with empty
arrays.

The latest-run lookup queries `notion_sync_runs`, checks the returned Supabase
error explicitly, and maps `finished_at` and `status` into the existing
dashboard freshness fields. A status lookup failure remains non-fatal to the
main sync payload: dashboard data is returned with null freshness metadata.

The run-history route selects fields that exist in the migration:
`run_id`, timing, mode, status, total counts, and error.

## Resumable Notion Pagination

Write mode loads `last_cursor` for each source before querying Notion. Dry-run
mode starts from the beginning and never reads or mutates checkpoints.

For each source, the worker:

1. Requests one bounded Notion page with `page_size` and, when present,
   `start_cursor`.
2. Normalizes valid records and converts invalid records into dead letters.
3. Durably inserts dead letters and upserts valid records.
4. Saves the returned `next_cursor` only after both writes succeed.
5. Repeats until the run-wide source limit is reached or Notion reports no
   additional page.

When Notion reports the end of a source, the checkpoint cursor is cleared so a
later run starts a fresh reconciliation. When the configured limit stops a run
mid-source, the next cursor is retained so the next approved write run
continues forward.

Checkpoint `records_synced` records the cumulative number of valid records
written for that source during the current run. Advancing past a malformed
record is safe because its dead letter is written durably before the cursor
advances.

## Failure Semantics

- A KV query failure returns an API error and does not produce a
  success-shaped empty dashboard payload.
- A worker page failure leaves the previous checkpoint intact for that page,
  marks the run failed, and exits non-zero.
- A run-status lookup failure does not hide otherwise valid dashboard data.
- Missing credentials and the write-approval gate continue to fail closed
  before external writes.
- No service-role or Notion credentials enter client code, output summaries,
  logs, fixtures, or committed environment files.

## Validation

Add or update tests that prove:

- The browser defaults to `/api/server` and still supports `VITE_API_BASE`.
- The Vercel handler populates sync collections from KV rows.
- Both freshness endpoints query `notion_sync_runs` using migrated columns.
- A multi-page Notion response sends the expected `start_cursor`.
- The worker stops at the configured limit and retains a continuation cursor.
- A completed source clears its cursor for a later reconciliation.
- Checkpoints advance only after durable page writes.

Run the existing repository test suite and production build after the changes.

## Out of Scope

- Removing the existing Supabase Edge Function implementation.
- Changing dashboard page data-access boundaries.
- Changing Notion schemas, source mappings, or normalization semantics.
- Broad authentication hardening unrelated to these regressions.
