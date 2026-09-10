# CR8W OS Database Layout and Migration Map

**Date:** 2026-09-10
**Sources:** Manus share replay `TknwtsAIYGlOw9uvXgZyn7` ("CR8W OS Master System Database Layout Summary"), the two Manus PDF decks, the full Manus session file set (downloaded to `.plugin-builder-tmp/files/`), and the current repo state.

---

## 1. The database layout, as extracted from Manus

### System boundary

```
Notion (source of truth) --protected sync--> Supabase (read mirror) --dashboard API--> cr8w.com
```

- Notion owns all records. The dashboard never writes to Notion.
- Supabase is a read mirror plus auth, calendar tokens, intake staging, and existing dashboard records.
- The frontend polls the mirror and renders explicit freshness metadata (`mirrorUpdatedAt`, `sourceLastEditedAt`, `syncRunId`).

### Mirror storage

One KV table: `public.kv_store_8dcd9693` (`key text primary key`, `value` column confirmed as either `text` or `jsonb`; exact type still unverified against the live catalog).

Operational keys: `cr8w_tasks`, `cr8w_stations`, `cr8w_forum`, `cr8w_messages`, `cr8w_braindumps`, `cr8w_announcements`, `cr8w_forum_replies`, `cr8w_workshops`, `cr8w_workshop_programs`, `cr8w_workshop_resources`, `cr8w_coflow_dates`, `cr8w_coflow_checkins`, `cr8w_well_notes`, `cr8w_calendar_events`, `cr8w_notion_sync_meta`.

Mirror keys: one `cr8w_notion_mirror_<source>` per registered Notion source.

### Registered Notion sources (production verified 2026-09-10)

| Source | Mirror key | Sensitivity | Records | Status |
|---|---|---|---:|---|
| People | `cr8w_notion_mirror_people` | team | 13 | verified |
| Flows | `cr8w_notion_mirror_flows` | team | 3 | verified |
| Moves | `cr8w_notion_mirror_moves` | team | 4 | verified |
| Content | `cr8w_notion_mirror_content` | team | 2 | verified |
| Money | `cr8w_notion_mirror_money` | restricted | 2 | restricted (dev samples) |
| Engineering Delivery | `cr8w_notion_mirror_engineering_delivery` | restricted | 1 blocked record found | fail-closed, no grant |

### Production read path (measured)

- `GET /api/dashboard-sync`: mean latency 0.667s, payload 55.5 KB, one Supabase query per load.
- Client-side search/filter while payload stays under ~250 KB and 500 records.
- 30-second visible-tab polling with backoff.

### v2 typed property envelope

```jsonc
{
  "recordSchemaVersion": 2,
  "source": "money",
  "sourcePageId": "notion-page-id",
  "sourceUrl": "https://www.notion.so/...",
  "sourceLastEditedAt": "2026-09-10T13:23:36.781Z",
  "archived": false,
  "properties": {
    "Amount": {
      "notionType": "number",   // original Notion type
      "value": 123.45,          // normalized machine value
      "displayValue": "123.45", // human-readable
      "sensitivity": "restricted",
      "isEmpty": false          // distinguishes empty from zero/false
    }
  }
}
```

Sync metadata tracks `recordSchemaVersion: 2`, `typedSources: string[]`, and `validationErrors: []`. The frontend must dual-read v1 (primitive) and v2 (envelope) records during the rollout.

### Atomic publication RPC

`public.cr8w_publish_notion_snapshot(run_id, record_schema_version, typed_sources, source_last_edited_at, snapshots)`:

- `security definer`, `search_path = public, pg_temp`, EXECUTE revoked from `public`.
- Transaction-scoped advisory lock `pg_advisory_xact_lock(hashtextextended('cr8w_notion_publish', 0))` serializes publishers.
- Validates: run ID, schema version 2, non-empty snapshot array, duplicate keys, key allowlist, metadata shape/run-ID match/counts, per-record `sourcePageId`/`source`/`properties`/`recordSchemaVersion`/`archived`, and catalog-derived `value` column type (accepts exactly `text` or `jsonb`, casts dynamically).
- Upserts present keys, deletes intentionally absent keys, all in one transaction. Any failure rolls back everything.
- Returns `{ committed, run_id, keys_written, record_schema_version, typed_sources }`.

---

## 2. Gap map: Manus artifacts vs this repo

All Manus files are staged in `.plugin-builder-tmp/files/` (signed URLs expire 2026-09-12; the copies are now local).

**Phase 0 landed 2026-09-10.** The artifacts below marked Yes were copied into their real repo paths and verified locally: mock RPC harness passed (4/4 scenarios), contract tests 6/6, atomic RPC tests 4/4, rollback tests 5/5, rollback integration 5/5, shell syntax checks passed, full Vitest 8 files / 50 tests passed (bounded worker), production build passed. New `package.json` scripts: `test:contract`, `test:atomic-rpc`, `test:rollback`, `test:rollback:integration`, `rollback:verify`.

| Artifact | Manus origin path | Repo path | In repo? |
|---|---|---|---|
| `20260910_cr8w_atomic_notion_publish.sql` | `supabase/migrations/` | `supabase/migrations/20260910_cr8w_atomic_notion_publish.sql` | Yes |
| `notion-contract.ts` (v2 shared contract) | `src/shared/` | `src/shared/notion-contract.ts` | Yes (not yet imported by `api/`) |
| `notion-contract.test.ts` | `tests/` | `tests/notion-contract.test.ts` | Yes |
| `notion-sync.ts` (v2-wired handler) | `api/` | `api/notion-sync.ts` | Diverged: repo version still uses `api/notion-property-envelope.ts`, Manus version imports `../src/shared/notion-contract`. Reconciliation is the next code task. |
| `apply-atomic-rpc-nonprod.sh` | `scripts/` | `scripts/apply-atomic-rpc-nonprod.sh` | Yes (chmod +x) |
| `inspect-kv-column.sh` / `.sql` | `scripts/` | `scripts/inspect-kv-column.*` | Yes |
| `verify-atomic-rpc-payload.mjs` + test | `scripts/` + `tests/` | landed | Yes |
| `verify-v2-rollback-backup.mjs` + test | `scripts/` + `tests/` | landed | Yes |
| `v2-rollback-mitigation.mjs` + integration test | `scripts/` + `tests/` | landed | Yes |
| `rollback-operator-guard.mjs` | `scripts/` | `scripts/rollback-operator-guard.mjs` | Yes |
| `test.yml` (GitHub Actions) | `.github/workflows/` | `.github/workflows/test.yml` | Yes (step updated to run the node:test suites plus Vitest and build) |
| `NotionMirrorSummary.tsx` (registry-driven UI) | `src/` | `src/components/...` | No (repo UI still hard-codes five source keys; staged in `.plugin-builder-tmp/files/`) |
| `package.json` test scripts | root | merged into root `package.json` | Yes (repo `test` stays on Vitest; Manus scripts added alongside) |

### Confirmed divergences and decisions needed

1. **RPC allowlist vs registry.** The RPC approves 5 mirror keys + sync meta. The repo registry has 6 sources; `engineeringDelivery` is intentionally fail-closed. When a grant is eventually created, the RPC allowlist must add `cr8w_notion_mirror_engineering_delivery` in the same migration that enables it. Until then, the gap is correct behavior.
2. **Two normalizer implementations.** Repo: `api/notion-property-envelope.ts` (deployed, tested, 45 tests passing). Manus: `src/shared/notion-contract.ts` (closed v2 union, `notionType`, `isEmpty`, validation gate, dual-read helpers). These must be reconciled, not run in parallel. The Manus contract is the designated v2 target per `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`.
3. **Writer path.** Repo `api/notion-sync.ts` writes per source via sequential mirror writes. The plan requires one RPC call per sync run. The application contract (fetch, normalize, validate, build bundle, single RPC) is specified in `NOTION_V2_NONPROD_SUPABASE_AND_ATOMIC_SYNC_PLAN.md` section 3.1.

---

## 3. Supabase migration plan

Phase order and gates, consolidated from the Manus plan docs:

**Phase 0: Land the artifacts in version control** — DONE 2026-09-10. Migration SQL in `supabase/migrations/`, seven operator/verification scripts in `scripts/`, four node:test suites in `tests/`, shared contract in `src/shared/`, CI workflow in `.github/workflows/test.yml`, and five new `package.json` scripts. All local gates passed (see section 2). Remaining Phase 0 follow-up: commit these files on a branch and push so CI runs the new workflow.

**Phase 1: Confirm the live column type**
1. Load a dedicated non-production `SUPABASE_DB_URL` from the approved secret store.
2. Run `scripts/inspect-kv-column.sh` (guarded; refuses production-looking URLs without `ALLOW_NONPROD_MIGRATION=1`).
3. Record whether `kv_store_8dcd9693.value` is `text` or `jsonb`. The RPC handles both, but the test fixtures and wrapper must match the confirmed type.

**Phase 2: Non-production project**
1. Create a separate Supabase project (suggested: `cr8w-dash-v2-rollback-nonprod`), same region class, isolated credentials, synthetic fixtures only. No production secrets, no production Notion data, no Money records.
2. Bootstrap `kv_store_8dcd9693` with the confirmed column type.
3. Apply the RPC migration via `ALLOW_NONPROD_MIGRATION=1 ./scripts/apply-atomic-rpc-nonprod.sh`.
4. Grant EXECUTE only to the server-side sync role (replace the `cr8w_sync_service` placeholder after inspecting real roles).

**Phase 3: Live integration tests (13-step sequence)**
Per the plan doc section 2.5: baseline bundle, manifest with SHA-256 per key, successful multi-key publish, failure injection (no key may change), rollback restore including intentionally absent keys, concurrent publish serialization, then cleanup and credential revocation. Requires `psql` and Docker/Podman locally; both are currently missing on this machine.

**Phase 4: Production rollout**
1. Wire the RPC call in `api/notion-sync.ts` behind a disabled feature flag. Dry-runs must never call the RPC.
2. Deploy with flag off; run protected production dry-run.
3. Capture a verified rollback backup + manifest (`verify-v2-rollback-backup.mjs` strict mode: `present`, `byteLength`, `sha256` type validation).
4. Enable one controlled real write for one non-sensitive source; verify all keys and metadata changed as one generation.
5. Keep the sequential writer disabled but available for emergency code rollback. Never run both writers concurrently.

---

## 4. Notion sync plan (v2 envelope rollout)

Source-by-source, triggered by `typedProperties: true` in `api/notion-sources.ts` plus a successful real-write sync. No database schema change is required for the JSON mirror itself.

| Phase | Source(s) | Status |
|---|---|---|
| 1 | Money | v2 envelope active in Manus sandbox; repo registry still needs the flag after the contract lands |
| 2 | Flows, Content | pending protected dry-run (blocked on operator token) |
| 3 | Moves, People | queued |

Gates per source:

1. Land `src/shared/notion-contract.ts` and reconcile with `api/notion-property-envelope.ts` (single normalizer, closed type union).
2. Dry-run first: record count, property names, archived count, latest edit time, errors.
3. Fixtures: one Checkbox and one Number property per source where supported.
4. Verify dashboard count, filter, search, and freshness label after the real write.
5. Money stays restricted. Engineering Delivery stays fail-closed until a named server-managed grant is created and separately validated.

### Explicit property-type tests still owed

Flows `Public?` (boolean), Flows `Capacity` (number|null), Content `Final?` (boolean), Money `Amount` (number|null), plus Created time, Last edited time, Created by, Last edited by, URL, email, phone number, and unsupported formula/rollup subtypes represented safely rather than discarded.

---

## 5. Open blockers

1. **Operator token.** The protected dry-run fails with HTTP 401. A local 50-character value was rejected and removed. The exact existing production `NOTION_SYNC_OPERATOR_TOKEN` must come through an approved secure channel. Do not rotate, generate, or guess.
2. **Local tooling.** `psql`, Docker, and Podman are missing on this machine; needed for Phase 1 inspection and Phase 3 container tests.
3. **Column type.** `kv_store_8dcd9693.value` text-vs-jsonb unconfirmed against the live catalog.
4. **Non-production project.** Not yet created; requires an authorized owner and isolated credentials.
5. **Manus signed URLs expire 2026-09-12.** All referenced files are already copied into `.plugin-builder-tmp/files/`, so this is no longer a risk.

## 6. Safe boundary (unchanged)

No master password, no shared account, no frontend secret, no direct browser write to Notion. Supabase Auth for humans; the protected server operator for mirror writes; the RPC executable only by the server-side role.
