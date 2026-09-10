# Next Notion Sources Iteration

## Decision

**YES: move to a metadata-driven source registry.** The current adapter already includes Money, but Money currently contains zero records. The next slice should make source enablement, display labels, property mappings, and UI behavior explicit instead of scattering source names across the server and dashboard.

## Current evidence

The production mirror contains 13 People records, 3 Flows records, 4 Moves records, 2 Content records, and 0 Money records. The current normalizer already handles title, rich text, select, status, multi-select, date, people, relation, unique ID, formula, and rollup properties. Custom properties are therefore read today, but they are flattened into a generic `properties` object without a source-specific display schema.

The production read endpoint returned HTTP 200 in approximately 0.92 seconds with a 54.9 KB payload. It performs one Supabase query for the operational keys, freshness metadata, and five mirror keys. The latest Vercel request log showed one successful `GET /api/dashboard-sync` request with HTTP 200. That log is not a sustained polling sample, so it confirms correctness, not long-run request volume.

## Phase 1: source registry

Create one server-side registry with the source key, Notion data-source ID, display label, enabled state, and a small list of display fields. The registry should drive the Notion operator sync, mirror read endpoint, freshness counts, and dashboard source filter. Adding a database should then require one registry entry plus a property mapping, not edits in several files.

Recommended shape:

| Field | Purpose |
| --- | --- |
| `key` | Stable mirror namespace such as `money` or `people` |
| `dataSourceId` | Notion data-source identifier kept server-side |
| `label` | Human-readable dashboard label |
| `enabled` | Safe rollout switch |
| `displayFields` | Ordered property names used for cards and search |
| `sortField` | Optional property used for newest-first display |
| `sensitivity` | Controls whether values are shown in the team dashboard |

## Phase 2: Money validation

Keep the existing Money data-source ID, but first confirm that the database is the intended source and that its integration has access. Run a dry-run only and inspect the property names and result count. If the result remains zero, treat that as a source configuration issue rather than a frontend bug.

For Money records, define a minimal display contract: transaction or item name, amount, currency, status, owner, date, and source URL. Do not expose bank details, account numbers, payment credentials, or private notes in the dashboard. The mirror can retain normalized source properties server-side while the frontend receives only approved display fields.

## Phase 3: custom-property contract

Change normalization from a value-only object to an optional typed property envelope for new sources. Preserve backward compatibility for existing records.

Recommended new shape:

```ts
interface NotionPropertyValue {
  type: string;
  value: unknown;
  displayValue?: string;
}
```

Existing sources may continue returning plain values. New sources can request typed values when filtering, sorting, or rendering depends on the property type. This avoids guessing whether a number is a currency amount, a count, or an identifier.

The normalizer should also handle checkbox, number, created time, last edited time, created by, and last edited by explicitly. People and relation properties should include stable IDs plus safe display names when the Notion response provides them. Formula and rollup values need a safe fallback for unsupported result types rather than silently returning an unusable object.

## Phase 4: dashboard UI

Add a source registry-driven filter rather than hard-coding five buttons. Each source can declare whether it is visible, searchable, and sensitive. For Money, default to a compact summary card with amount and status, then require an explicit source filter before showing individual records.

Search should remain client-side for the current small mirror size. If the mirror grows beyond roughly 500 records or the payload exceeds 250 KB, move search and pagination into the read endpoint. Until then, the current single-request model is simpler and faster to operate.

## Phase 5: rollout and checks

1. Add the source registry and property display maps behind `enabled: false` for any new source.
2. Run a dry-run and record source count, property names, latest edit time, and rejected or archived records.
3. Enable Money only after its count and sensitivity review pass.
4. Add source-specific UI tests for empty, populated, malformed, and sensitive-property cases.
5. Measure three production samples of endpoint latency and payload size during active team use.
6. Keep the 30-second visible-tab polling interval unless the measurements show request load or latency problems.
7. Add a periodic reconciliation record later if sync history, retries, or audit reporting becomes necessary.

## Safe development access

The application currently uses Supabase Auth with individual email/password accounts. There is no safe master-password or admin-bypass mechanism in the code, and I will not create one. Use the Register flow with a dedicated development email, or create a separate Supabase development project and seed a test user there. The browser publishable key is public configuration, not a login credential. Never place `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `NOTION_API_KEY`, or `NOTION_SYNC_OPERATOR_TOKEN` in frontend code, chat, screenshots, or `.env` files committed to Git.
