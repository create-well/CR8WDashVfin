# Validation

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
