# Notion Sync Operations

Operator runbook for the Notion -> Supabase mirror behind the CR8W dashboard
(cr8w.com). Boundary: **Notion owns truth, the dashboard never writes to
Notion, Supabase is a read mirror.** All record edits happen in Notion; the
sync copies them into the KV table.

Project: Supabase `axntibrdivycxdwlzk` · Vercel `cr8w-dash-vfin` · repo
`create-well/CR8WDashVfin`.

## 1. Environment

Required variables (validate with `node scripts/validate-vercel-env.mjs`):

| Variable | Used by | Notes |
|---|---|---|
| `NOTION_API_KEY` | sync, audit | server-side only |
| `NOTION_SYNC_OPERATOR_TOKEN` | `POST /api/notion-sync` auth | rotate on teammate departure |
| `SUPABASE_URL` | sync, audit | `https://axntibrdivccycxdwlzk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sync, audit | server-side only, never the publishable key |
| `CRON_SECRET` | `GET /api/cron/notion-sync` auth | must be set in Vercel for cron; fails closed (401) when unset |

The operator scripts load `.env.local` from the repo root if present (real
environment variables win). `.env.local` is gitignored and never committed.

## 2. Running the sync

Use the operator runner — it bundles `api/notion-sync.ts` with esbuild and
runs it locally against production Supabase:

```bash
node scripts/run-notion-sync.mjs                    # dry-run, all sources (default)
node scripts/run-notion-sync.mjs --sources people   # targeted dry-run
node scripts/run-notion-sync.mjs --write            # real mirror write
```

Mandatory sequence (per operator rules):

1. **Dry-run first.** Inspect per-source counts and `validationErrors: 0`.
2. **Write** only after the dry-run is clean: re-run with `--write`.
3. **Verify** after a write:
   - `curl https://www.cr8w.com/api/dashboard-sync` — counts match, fresh
     `mirrorUpdatedAt`.
   - Dashboard UI — cards render for the changed source.

The runner exits non-zero when a source fails or contract validation errors
exist. It cleans up its temporary bundle either way.

HTTP alternative (equivalent, for reference):

```bash
# dry-run
curl -X POST https://www.cr8w.com/api/notion-sync \
  -H "Authorization: Bearer $NOTION_SYNC_OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
# write
curl -X POST https://www.cr8w.com/api/notion-sync \
  -H "Authorization: Bearer $NOTION_SYNC_OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## 3. Auditing drift and schema

```bash
node scripts/audit-notion-sources.mjs
```

Read-only against both backends. Per enabled source in `api/notion-sources.ts`
it checks: (a) registry `displayFields` exist in the live Notion schema,
(b) live property types are covered by the v2 normalizer, (c) live Notion
record count equals the Supabase mirror count. Exit 0 = clean, exit 1 =
findings printed. Keep its `SUPPORTED_TYPES` list in sync with
`api/notion-property-envelope.ts`.

## 4. Cron status

`vercel.json` schedules `GET /api/cron/notion-sync` every 15 minutes.
Observed 2026-09-10: **cron is not firing** — zero invocations across
schedule boundaries on a production deployment. This matches Vercel's
once-daily cron limit on non-Pro plans; sub-daily schedules do not run.
Unresolved. Two paths:

- **Recommended for now:** operator cadence — run
  `node scripts/run-notion-sync.mjs --write` after meaningful Notion edits,
  then verify. Team habit: end-of-day sync.
- Plan upgrade (Vercel Pro) restores the 15-minute schedule. Also requires
  `CRON_SECRET` set in Vercel env or every cron call 401s (the route fails
  closed by design).

## 5. KV layout notes

- Table `public.kv_store_8dcd9693`, columns `(key text, value jsonb)`.
- Mirror keys: `cr8w_notion_mirror_<source>` for each enabled source plus
  `cr8w_notion_sync_meta` (run id, counts, freshness, schema version).
- **Values are double-encoded by design:** the writer stores
  `JSON.stringify(value)` into the jsonb column, so every mirror value is a
  JSON string containing the actual JSON. Readers parse twice. Any SQL or
  RPC that touches mirror values must handle string-in-jsonb (the draft
  atomic publication RPC already expects this shape).
- Verified 2026-09-10: all six sources in sync, 26 records total, meta
  `recordSchemaVersion: 2`.

## 6. Access grants (dashboard auth)

Human access is individual Supabase Auth accounts; there is no shared
password. Grants live in `app_metadata`:

- `cr8w_role: 'admin'` — full dashboard access.
- `cr8w_source_grants: string[]` — per-source overrides for restricted
  sources (`money`, `engineeringDelivery`). The `engineeringDelivery`
  source additionally requires the admin role (`canReadSource` special
  case); a plain source grant is not enough.

To change a grant, use the Supabase admin API with the service role key;
send **both** `apikey` and `Authorization: Bearer` headers or the call
returns 401.

## 7. Operational notes

- **Operator token rotated 2026-09-10.** The current
  `NOTION_SYNC_OPERATOR_TOKEN` in `.env.local` is valid against production.
- **Mirror wipe incident 2026-09-10 ~14:00:** an old pre-preflight
  deployment wrote empty arrays to the mirror. Notion was unaffected;
  re-running the sync restored all records. Lesson: deploy only from clean
  committed checkouts (`git archive HEAD`).
- **Doc drift:** the bundled cr8w-os skill file still lists People as 13
  records; live count is 14 (Pia added 2026-09-10). The skill file is
  plugin-managed; repo and live Notion win.
- **Adding a source:** edit `api/notion-sources.ts` (registry only), then
  follow the operator sequence — schema access, property-type map, dry-run
  counts, sensitivity review, real write, endpoint check, UI filter check.

## 8. Rollback

The atomic publication path (`CR8W_ATOMIC_RPC_ENABLED === 'true'`) publishes
all source snapshots plus metadata in one transaction via
`public.cr8w_publish_notion_snapshot`. Emergency rollback = set the flag to
`false` (sequential writer). Draft SQL and the non-prod test sequence live
in `references/` (see the cr8w-os skill index). The value column is `jsonb`
holding strings; the RPC accepts exactly that shape.
