# Validation

## Shared Calendar Synchronization Health — 2026-09-11

- Full CI-equivalent local gate passed: `pnpm test && pnpm check`.
  - Vitest: 15 files, 122 tests.
  - Node `.mjs`: 17 tests.
  - Node stripped-TypeScript: 13 tests.
  - TypeScript typecheck: passed.
  - Vite 6.4.3 production build: passed.
- Focused Chromium coverage passed:
  `pnpm exec playwright test e2e/dashboard.spec.ts --grep 'shared-calendar|unconfigured shared calendar|calendar-only warning|mirror stale'`.
  Result: 8 tests passed.
- Browser scenarios cover unconfigured, never synchronized, healthy empty,
  healthy populated, stale, and failed-with-last-known-good states. They also
  verify that unconfigured refresh is disabled and calendar-only warnings do
  not display the dashboard Retry button.
- `git diff --check` passed.
- The broader existing sign-in-gate E2E remains environment-dependent when a
  fresh browser context has no local Supabase browser configuration. It is
  unrelated to calendar health and was not changed.

## Registry-Driven Mirror UI Validation — 2026-09-10

- Scope: `NotionMirrorSummary.tsx` (registry-driven collections + Money amount display), `ThisWeekPage.tsx` (passes `data.notionSources`), `NotionMirrorSummary.test.ts` (five new cases).
- Vitest could not start workers within 60 s across forks, threads, single-fork, and vmThreads pools; root cause is machine load (Spotlight indexing and Docker pinning cores, load avg 4.8–6.8), not the code. This is an environment limitation, not a pass.
- Fallback: the full test file was bundled with esbuild and executed in plain Node with a minimal vitest shim (`scripts/validate-mirror-summary.mjs`). All 15 assertions passed, including: registry-order collections, invisible-source hiding, unknown-key skipping, static-label fallback, Money amount formatting from typed envelopes and plain numbers, and null handling for missing or non-finite amounts.
- `pnpm build` passed (built in 7m 36s under the same load; `ThisWeekPage` chunk hash changed, confirming the new code is in the bundle).
- Resolved 2026-09-10 ~14:06: real Vitest passed. Focused file: 15/15 in 45s. Full serial suite (`--maxWorkers=1`): 8 files, 50 tests passed in 78s. Root cause of the earlier worker-start timeouts was concurrent vitest runs from another IDE session on this same repo plus machine load; once those cleared, workers started normally. The esbuild harness remains in `scripts/` as a backup but is not needed for normal runs.
- Deployed 2026-09-10 ~14:15: commit `027eb65` from clean archive to `cr8w-dash-vfin`, Ready, aliased to `https://www.cr8w.com`. Live: homepage HTTP 200; unauthenticated `/api/dashboard-sync` HTTP 401 (fail-closed); deployed `ThisWeekPage-Zd-PgvrY.js` contains the new code markers. Outstanding: one authenticated visual pass on the Money amounts (needs a logged-in browser).

## Production Money Filter Test

The production homepage returned HTTP 200. The production dashboard sync endpoint returned the current Notion freshness metadata and Money count 2.

| Money record | Amount |
| --- | ---: |
| `[DEV SAMPLE] Money expense test` | -67.89 |
| `[DEV SAMPLE] Money income test` | 123.45 |

The source code confirms the Money filter is wired in `NotionMirrorSummary.tsx`: the filter key is `money`, the button and select option use the label `Money`, and matching records render as linked cards with the record label.

The connected browser navigated to `https://www.cr8w.com`, but the browser view artifact failed with a Chrome extension access error before a visual screenshot or click result could be captured. API and code-path checks passed. A visual click test remains pending when browser viewing is available.

## Handoff Prompt Review

Reviewed and corrected `AI_HANDOFF_PROMPT.md`:

- Updated the latest implementation and production deployment identifiers.
- Changed the pending-sync language to completed-sync language.
- Recorded the verified Money count of 2 and sync run ID.
- Replaced the old release sequence with the next typed-property and source-discovery sequence.

## Next Iteration Plan

`NOTION_SOURCES_NEXT.md` now prioritizes a typed property envelope, a protected source discovery manifest, one approved new database at a time, registry-driven UI metadata, visible Money amounts, and payload thresholds for moving search server-side.


## Typed-contract validation update

> Provenance: Manus sandbox session, 2026-09-10 (`_incoming/manus-20260910/VALIDATION.md`). Validation ran in the sandbox clone `/home/ubuntu/CR8WDashVfin-validation`, not on this machine.

The desktop sidecar was unavailable, and the mounted path contained only the component and handoff artifacts. Validation was completed in `/home/ubuntu/CR8WDashVfin-validation`, cloned from `create-well/CR8WDashVfin` on `feat/notion-freshness-contract`.

The typed property slice now includes the protected `api/notion-source-metadata.ts` endpoint, registry-driven source metadata in `api/dashboard-sync.ts`, typed Money normalization in `api/notion-sync.ts`, frontend contracts, context wiring, and dynamic source filters with USD Money cards.

| Check | Status |
| --- | --- |
| Frontend production build | Pass |
| Changed API files parsed with esbuild | Pass |
| `git diff --check` | Pass |
| Production deploy from this slice | Not run |
| Protected metadata endpoint against production | Not run |
| Production dashboard endpoint after this slice | Not run |
| Browser UI check after this slice | Not run |

The build retains the pre-existing large-chunk warning: the main JavaScript chunk is approximately 951 kB minified. Defer code-splitting until measured active-use performance shows a problem.

Do not claim this slice is production-ready until the pushed commit is deployed, the protected metadata endpoint is checked, `GET /api/dashboard-sync` confirms source metadata and Money count 2, and the Money card visual check passes.


## Preview deployment verification

> Provenance: Manus sandbox session, 2026-09-10 (`_incoming/manus-20260910/VALIDATION.md`). Preview deploy was created by the Vercel Git integration from the sandbox push.

Commit `671a955` produced Vercel preview deployment `dpl_F3TzxDx4FX5b3M4VBTy32eQE19gp` at `https://cr8w-dash-vfin-rjibk3olb-monnylog.vercel.app` with state `READY`.

The deployed dashboard endpoint returned HTTP 200 with freshness source `notion`, mirror counts People 13, Flows 3, Moves 4, Content 2, Money 2, and source keys for all five registered sources. The protected metadata endpoint correctly returned HTTP 401 without authorization. The success-path metadata check is deferred because `NOTION_SYNC_OPERATOR_TOKEN` is not available in the sandbox.

The local `vercel` CLI was unavailable, so the existing Vercel Git integration created the branch preview automatically after the GitHub push. The production alias `cr8w.com` was not changed by this branch deployment.

## Authenticated UI Verification — Atomic Sync — 2026-09-10 ~16:45 local (Kimi session via WebBridge)

Verified in the user's logged-in browser after the first atomic-RPC production sync (run `notion-1789083477542-a538f868`):

- NOTION MIRROR panel: "Updated 7m ago"; all six sources "Healthy · synced 7m ago" — People 13, Flows 3, Moves 4, Content 2, Money 2, Engineering Delivery 1. 25 matching records.
- Money filter: both `[DEV SAMPLE]` records render amounts below the record name — expense `-67.89`, income `123.45`. This closes the long-pending authenticated Money-amount visual pass.
- Screenshots: `docs/cr8w-thisweek-verify-20260910.png`, `docs/cr8w-mirror-verify-20260910.png`, `docs/cr8w-money-verify-20260910.png`.
- The two `[DEV SAMPLE]` Money pages remain in place pending the separate deletion decision.

## Cron Atomic Run + Post-Atomic Rollback Baseline — 2026-09-10 ~16:55 local (Kimi session)

Data-layer verification on production `axntibrdivccycxdwlzk` via Supabase MCP SQL:

- The first scheduled cron sync after flag activation ran clean: `cr8w_notion_sync_meta` shows `syncRunId notion-1789083936188-db002140`, `mirrorUpdatedAt 2026-09-10T23:45:36.472Z`. This is a newer run than the manual operator sync (`...477542-a538f868` at 23:37:57Z), so the `*/15` cron tick at 23:45Z used the atomic writer. Closes NEXT_ACTION item 4.
- Atomic writer signature confirmed: all seven `cr8w_notion_*` values are native jsonb (`object` / `array`), not the sequential writer's string scalars. Metadata counts equal actual array lengths for all six sources (13/3/4/2/2/1).
- Authorized dry-run with the rotated operator token (read from `.env.local`): `ok: true`, `writer: "none"`, 25 records across 6 sources, `validationErrors: []`. Rotated token works; pipeline healthy against current Notion state.
- Unauthenticated `GET /api/dashboard-sync` returns HTTP 401 — fail-closed as designed.
- Post-atomic rollback baseline captured: `.backups/backup-20260910T234305Z` (gitignored), via new `scripts/capture-rollback-backup.mjs --from-json` mode (commit `500c0d9`) fed by a trusted MCP SQL export, because the rotated service key is unavailable locally. Rollback gate: PASS, 7 files, 6 snapshots. This baseline sits between the manual atomic run and the first atomic cron — it is the atomic-era rollback point.

## Freshness UX Finalization — 2026-09-10 ~18:00 local (Kimi session)

Live logged-in walkthrough of `https://www.cr8w.com` surfaced two usability defects; both fixed in `1730888`, deployed, and re-verified live:

- **Mirror-stale threshold vs cron cadence.** `SyncStatusBar` flagged the mirror stale after 10 minutes while the cron writes every 15, so "Mirror stale" + Retry showed between every pair of healthy ticks. Threshold now 20 minutes (one full interval plus margin). Live result: status bar fully hidden in the all-healthy state.
- **Custom-domain banner on the custom domain.** `RootLayout` hardcoded `createwell.monnyfest.co` as the custom domain, so the "viewing via the direct link" banner rendered on `www.cr8w.com` itself. Condition inverted: banner now shows only on `*.vercel.app` direct links. Also updated the WelcomeModal iPhone install steps to `www.cr8w.com`.
- Env/connectors audit: all required Vercel production vars present (flag, `GCAL_CLIENT_SECRET`, `SUPABASE_JWKS_URL` refreshed same day); rotated operator token + Notion key verified working via dry-run. Nothing needed overriding — do not rotate working credentials.
- Local vitest/typecheck could not run (load avg 30-41, Docker pegged; the documented environment limitation). e2e stale fixture uses a day-old timestamp, unaffected. Vercel cloud build passed and is the verification gate.

## Functional Sweep + Countdown Fix — 2026-09-10 ~18:30 local (Kimi session)

Logged-in sweep of all seven registered routes (`/`, `/moves`, `/care`, `/flows`, `/money`, `/decisions`, `/system`): all render, zero `[role=alert]` errors, healthy empty states where stores are empty by design.

- Fixed in `48620ca`, verified live: TaskOverview and TopHeroCards rendered `getDaysToLaunch()` raw, producing "-148 DAYS UNTIL April 15, 2026" after the launch date passed. Both now match GeyserView/HubView past-launch handling. Live `/moves` shows "+148 days since" in both countdowns.
- Server env audit: every `process.env.*` referenced by `api/` is present in Vercel production EXCEPT two: `CR8W_ICAL_URL` (shared Google Calendar connector — route `POST /api/server/calendar-ical-sync` is deployed and ready; the secret iCal address was never configured; needs the URL from the shared calendar's Google settings) and `NOTION_WEBHOOK_SECRET` (in-flight `feat/notion-webhook`; handler is fail-closed without it — `verifySignature` returns false). Both resolved later the same day — see next section; `CR8W_ICAL_URL` re-blocked on calendar-owner action.
- Confirmed from the parallel session's landed commits: Engineering Delivery reconciliation decided (keep mirror storage, `5c2179d`), step-12 concurrency proof closed — all 13 atomic-sync plan steps now passed (`efe888d`), immutable asset caching added (`090ffce`).

## Notion Webhook Live + Calendar Gap Triaged — 2026-09-10 ~20:00 local (Kimi session)

- **Notion webhook subscription created and active** on the `comonny` integration (workspace co-monny, developers/connections UI). Endpoint `https://www.cr8w.com/api/notion-webhook`, API version 2026-03-11, all 28 event types subscribed (Page 8/8, Database 4/6, Data source 6/6, View 3/3, Comment 3/3, File upload 4/4). Notion reported "This subscription is currently active" after the endpoint returned 200 to its verification POST.
- **`NOTION_WEBHOOK_SECRET` set in Vercel production** (sensitive) to the subscription's verification_token, extracted from runtime logs (`[notion-webhook] verification_token=...` line). Production redeployed via `vercel redeploy` (env changes need a new deployment).
- **End-to-end verified live:** unsigned POST → 401 (fail-closed holds); correctly signed POST → 200 with `{"ok":true,"sources":["moves"],"counts":{"moves":4}}` — the data_source_id routing maps events to the right source and resyncs the mirror in seconds instead of waiting for the */15 cron.
- **`CR8W_ICAL_URL` remains unset — blocked on a human step.** The shared "✨⛲️Create Well⛲️✨" Google Calendar (`852831a7...@group.calendar.google.com`) is subscribed under monica.istorya@gmail.com with "See event details" only; it sits under "Settings for other calendars", which exposes no iCal address. Public iCal returns 404 (calendar not public). Neither of Monny's other signed-in accounts (make@monnymoves.com, ako@asapmonny.com) owns it. The fix: the calendar's owner opens Google Calendar → calendar settings → "Integrate calendar" → copies "Secret address in iCal format", then `printf '%s' "<url>" | vercel env add CR8W_ICAL_URL production --sensitive` and redeploy, then `POST /api/server/calendar-ical-sync` populates `cr8w_calendar_events` for the /moves Key Dates card.
