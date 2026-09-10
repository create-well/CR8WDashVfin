# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Latest implementation commits: `96a1776` (Geyser task/station slices) and `eff7e9d` (dashboard E2E navigation stabilization).
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read mirror plus auth, calendar tokens, intake staging, and existing dashboard records.
- Existing unrelated user changes remain uncommitted and untouched.

## Production Registry Deployment

The metadata-driven source registry, explicit Checkbox and Number normalization, Vercel ESM import fix, and parallel Notion source reads are deployed successfully.

- Deployment: `dpl_G3Q5A9w4LQzXNTXn9ahEoDhTQW4K`
- Production alias: `https://www.cr8w.com`
- Status: Ready

## Geyser Slice Deployment

The Geyser Moves route now mounts the extracted task and station components while retaining the existing DashboardContext mutation boundary. Production deployment `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU` is Ready and aliased to `https://www.cr8w.com`.

Validation completed locally: `pnpm build` passed; serial Vitest passed with 7 files and 34 tests; focused Playwright mutation coverage passed for task inline edit, station status update, and station creation; the full Playwright suite passed after stabilizing dashboard navigation on `domcontentloaded`.

## Protected Sync

A new `NOTION_SYNC_OPERATOR_TOKEN` was generated and stored as a Vercel Production Secret. The existing server-only `NOTION_API_KEY` was also added to Vercel Production because the function initially lacked it. The token was used locally for the approved sync request and removed from temporary local storage afterward.

The dry-run returned 24 records:

- People: 13
- Flows: 3
- Moves: 4
- Content: 2
- Money: 2

The real write completed with 6 mirror writes and run ID `notion-1789046614763-04fbf8ed`.

## Supabase Mirror Verification

`GET https://www.cr8w.com/api/dashboard-sync` returned HTTP 200 with:

| Source | Records |
| --- | ---: |
| People | 13 |
| Flows | 3 |
| Moves | 4 |
| Content | 2 |
| Money | 2 |

Freshness metadata:

- Source: `notion`
- Mirror updated: `2026-09-10T13:23:36.781Z`
- Source last edited: `2026-09-10T13:02:00.000Z`
- Sync run ID: `notion-1789046614763-04fbf8ed`

The Money mirror contains numeric Amount values `123.45` and `-67.89`, stable Notion page IDs, and generated unique IDs `MNY1` and `MNY2`.

## Handoff Prompt

`AI_HANDOFF_PROMPT.md` contains the optimized continuation prompt with the product goal, source-of-truth boundary, registry, secure auth rules, synced sample IDs, deployment sequence, verification commands, and performance thresholds.

## Existing Unrelated Working-Tree Changes

The following remain unstaged and untouched: `pnpm-workspace.yaml`, legacy import deletions, `.env.production`, and unrelated untracked source/test files.
