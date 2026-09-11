# Next Action

## Shared Calendar Connector — 2026-09-11

Implementation and local validation are complete. The only production unblock
is a calendar-owner action:

1. Obtain the shared calendar's **Secret address in iCal format** through a
   secure channel.
2. Configure it as the server-only `CR8W_ICAL_URL` production environment
   variable and redeploy.
3. Run `POST /api/server/calendar-ical-sync` with an authenticated dashboard
   session.
4. Verify `/api/dashboard-sync` reports `calendarSync.status: "ok"`, a current
   `lastSuccessfulSyncAt`, and a `recordCount` equal to `calendarEvents.length`.
5. Check the This Week calendar card on `www.cr8w.com`.

Do not paste the iCal URL into source, handoff files, logs, or client-side
configuration.

## Atomic RPC graduated — 2026-09-10 ~16:39 local (current state)

Production sync now writes through `public.cr8w_publish_notion_snapshot` (one transaction) with `CR8W_ATOMIC_RPC_ENABLED=true`. Full evidence in `STATE.md` under "Atomic RPC in Production". Operator token was rotated with user approval — read the current value from `.env.local`, not from any older note.

Next actions, in order:

1. ~~Authenticated UI pass~~ — DONE 2026-09-10 ~16:45 local (see VALIDATION.md): mirror panel fresh, Money amounts render, screenshots in `docs/`.
2. ~~Prove advisory-lock concurrency (step 12)~~ — DONE 2026-09-10 ~16:50 local over `psql` against non-prod: concurrent publish blocked ~5 s on the advisory lock, then committed; 407 ms uncontended control. All 13 plan steps now passed. Non-prod DB URL stored as `SUPABASE_NONPROD_DB_URL` in `.env.local`.
3. ~~Reconcile Engineering Delivery~~ — DECIDED 2026-09-10: keep mirror storage of `cr8w_notion_mirror_engineeringDelivery` in KV. Rationale: continuity with the pre-atomic sequential writer, which stored the same key; the read endpoint still capability-gates the source, so UI exposure is unchanged. Reversal path if the team decides otherwise: set `enabled: false` for `engineeringDelivery` in `api/notion-sources.ts`.
4. ~~Watch the next scheduled cron sync~~ — DONE 2026-09-10 ~16:55 local: the 23:45Z cron tick wrote through the atomic RPC (`syncRunId notion-1789083936188-db002140`, all values native jsonb, counts match). Post-atomic rollback baseline at `.backups/backup-20260910T234305Z`, gate PASS. See VALIDATION.md.

## Registry-Driven Mirror UI — 2026-09-10 (deployed)

Iteration 4 from `NOTION_SOURCES_NEXT.md` is implemented, validated, and deployed. `NotionMirrorSummary.tsx` derives its source list, labels, and filter options from the server-sent `notionSources` registry metadata (key, label, visible, recordCount) via a new exported `sourceCollections(mirrors, sources)` helper, falling back to the static label table only when no metadata has arrived. `ThisWeekPage` passes `data.notionSources` through. Money cards render the numeric `Amount` below the record name through `moneyAmountDisplay(record)` (typed envelope or plain number; no currency until the schema provides one; null-safe for missing or non-finite values).

Validation: real Vitest passed — focused file 15/15, full serial suite 8 files / 50 tests — after a concurrent IDE vitest run on this repo was cleared. `pnpm build` passed.

Deployment 2026-09-10 ~14:15 local: commit `027eb65` (feature `6e6213b` plus docs) deployed from a clean `git archive HEAD` checkout to Vercel project `cr8w-dash-vfin`. Deployment URL `cr8w-dash-vfin-hfmm10zht-monnylog.vercel.app`, status Ready, production alias `https://www.cr8w.com`. A second deployment of the same commit, `cr8w-dash-vfin-bj6l2sdn4-monnylog.vercel.app`, was created minutes later in the same project during a parallel session; both carry identical content and the alias points at whichever aliased last. Live checks: homepage HTTP 200 in 0.27 s; unauthenticated `/api/dashboard-sync` HTTP 401 (fail-closed, expected); deployed `ThisWeekPage-Zd-PgvrY.js` chunk contains the new registry-driven code (marker strings `notionSources`, `maximumFractionDigits`, `tabular-nums` present; function names minified). One stray deployment `cr8w-deploy-in1gb6eo9-monnylog.vercel.app` was created in a new unlinked Vercel project `cr8w-deploy` when the archive was first deployed without the `.vercel/project.json` link; it is not aliased to production and can be ignored or deleted in the Vercel dashboard.

Remaining: one authenticated visual pass on the mirror panel confirming Money amounts render under the sample records (needs a logged-in browser session). The two `[DEV SAMPLE]` Money pages remain the numeric regression fixture until a separate deletion decision.

## Prior state

Deployment is complete: commit `4eb77f0` is Ready as `dxSa9vxPiRMSDtY4JLfEPKkMFnxN` and aliased to `https://www.cr8w.com`. The fail-closed authorization and typed envelope parser are deployed.

The latest production deployment is `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU`; the live homepage returned HTTP 200 and `/api/dashboard-sync` returned HTTP 200 with Notion freshness metadata and 6 tasks / 6 stations.

Current status: clean production deployment, HTTP route/API checks, deployed-asset checks, post-deployment monitoring, and authenticated visual verification are complete. Overview, Stations, and Moves rendered successfully on `/moves`; no mutations were submitted.

After UI testing, delete only the two labeled sample pages if they are no longer needed. Keep the source registry and typed property normalization.

Next development cycle: obtain the exact existing production Notion sync operator token through an approved secure local channel and rerun the protected dry-run. A non-empty 50-character local value was rejected with HTTP 401 and has been removed; do not generate or rotate a replacement. The linked Master System and five operational schemas are captured in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; the typed envelope parser is now integrated and tested. Engineering Delivery remains restricted until a named server-managed grant is created and separately validated. Keep the two `[DEV SAMPLE]` Money pages until a separate deletion decision is made.

Decision on samples: keep both pages for now because they remain the current numeric Money regression fixture. The typed-envelope plan is documented in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; Engineering Delivery authorization is fail-closed and deployed, pending an explicit user grant if exposure is requested.

The source-family decision, schema capture, and server enforcement are recorded: use the existing CR8W Engineering Delivery data source, not the System Admin master sources. A bounded read-only aggregate found one non-archived `Blocked` record. The endpoint now rejects missing/invalid authentication and requires an explicit Engineering Delivery capability; do not expose or mirror-write the source until an authorized grant is intentionally created.

The user privately reset the individual Supabase password and authenticated successfully. Authenticated visual verification is complete: Overview, Stations, and Moves rendered on `/moves` after fixing custom-domain API routing and guarding the calendar response shape. No mutations were submitted.

Do not rotate or expose the operator token unless access is intentionally transferred.
