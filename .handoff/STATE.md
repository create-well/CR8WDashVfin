# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Latest implementation commits: `e3baa57` (remaining Geyser forum, overview, journey, and tab mounts), `96a1776` (Geyser task/station slices), and `eff7e9d` (dashboard E2E navigation stabilization).
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read mirror plus auth, calendar tokens, intake staging, and existing dashboard records.
- Existing unrelated user changes remain uncommitted and untouched.

## Current Verification Blocker

My Browser navigation reaches the live site, but screenshot upload and DOM/console artifact collection fail in the browser-extension layer. The same public route produces a valid screenshot in the isolated sandbox browser, which isolates the failure to the My Browser connector path rather than the deployed app. No connector configuration was changed.

## Engineering Delivery Decision

The approved source family is the existing CR8W Engineering Delivery data source `eb498877-a74f-4abe-bac3-8d1dfbc62db8`, not the separate System Admin master sources. The source remains restricted; no user grant or dashboard exposure was created. Its schema and the typed envelope draft are recorded in `docs/RESTRICTED_SOURCE_AUTHORIZATION_DRAFT.md` and `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`.

## Production Registry Deployment

The metadata-driven source registry, explicit Checkbox and Number normalization, Vercel ESM import fix, and parallel Notion source reads are deployed successfully.

- Deployment: `dpl_G3Q5A9w4LQzXNTXn9ahEoDhTQW4K`
- Production alias: `https://www.cr8w.com`
- Status: Ready

## Geyser Slice Deployment

The Geyser Moves route now mounts the extracted task, station, forum, overview, journey, and tab components while retaining the existing DashboardContext mutation boundary. Commit `e3baa57` was deployed from a clean archive as `dpl_EW8yQz1QqjD58XzpEmfdHrEoi385`; Vercel reports `READY` and the production alias is `https://www.cr8w.com`.

Validation completed locally: `pnpm build` passed with 2,141 modules transformed; full Vitest passed with 7 files and 34 tests using one bounded worker; and an isolated clean-checkout Playwright smoke test passed for task inline edit and station status mutation. Production homepage and `/moves` returned HTTP 200, `/api/dashboard-sync` returned HTTP 200 with 6 tasks and 6 stations, and the deployed lazy assets contain Overview, Journey, Stations, Moves, Forum, and Geyser markers.

## Post-Deployment Verification

- Live `https://www.cr8w.com/moves` navigation succeeded in My Browser, but authenticated interaction across all tabs remains **NOT NOW**: the browser connector returned no viewport elements, failed screenshot upload, rejected page DOM/console inspection with a Chrome-extension artifact error, and rejected the alternative browser-console execution path as unsupported. Static production asset checks confirm all six tab components are deployed; they do not replace authenticated click verification.

Authenticated verification is now complete after the user privately reset the individual Supabase password. The first live check exposed a custom-domain API fallback to the retired `cr8w-home-v2` host and a non-array calendar runtime response that crashed `MovesPage`. Commits `be82d18` and `1565ca9` fixed same-origin routing and calendar response normalization. The final `/moves` check rendered Overview, Stations, and Moves with `Dashboard fetched just now`; no mutations were submitted.
- `GET /api/dashboard-sync` returned HTTP 200 in three direct probes. Total latency was 0.733s, 0.564s, and 0.704s; mean 0.667s; payload size 55,518 bytes. The response contained Notion freshness metadata, 6 tasks, 6 stations, 10 messages, and no forum records.
- Vercel runtime logs for deployment `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU` showed four `/api/dashboard-sync` requests, all HTTP 200, with no recent error or fatal entries. Build logs show the Vite build completed and deployment reached Ready; pre-existing Vercel TypeScript diagnostics for missing Node types and Supabase auth typings were emitted but did not block deployment.

## Post-Deployment Monitoring — 2026-09-10

- Three consecutive `GET /api/dashboard-sync` probes returned HTTP 200 with identical 55,518-byte payloads and stable counts of 6 tasks, 6 stations, and 0 forum records. Latencies were 1.189s, 0.554s, and 0.537s.
- The mirror freshness timestamp remained `2026-09-10T13:23:36.781Z`, approximately 226 minutes old at the 17:09 UTC check. This is a freshness concern, not a failed request; do not present the mirror as current without the existing freshness indicator.
- The latest deployment was `READY`; Vercel reported no runtime error clusters in the selected one-hour window and one HTTP 200 `/api/dashboard-sync` request in grouped logs. The 24-hour error view showed only a pre-existing Node `url.parse()` deprecation warning on `/api/server/[[...path]]`, not an application failure.
- A safe GET/OPTIONS check of `/api/notion-sync` returned HTTP 405/200 respectively, confirming the protected sync endpoint was not written to. Direct probes of `/api/notion-sources` and `/api/notion-source-metadata` are not valid dashboard health checks: the former returned a server error when requested as a route, while the latter is not included in the deployed commit and returned 404. Neither endpoint is referenced by the current frontend.

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

## Typed Envelope and Authorization Review — 2026-09-10

The typed-property plan remains the correct next implementation boundary: replace the open `type: string` envelope with a closed Notion property-type union, preserve source-specific value types, add `sourceProperty` provenance, and reserve non-fatal `warnings` for unsupported types or invalid normalization. Required tests cover number, checkbox, select, status, multi-select, date ranges, relations, URLs, unique IDs, formulas, rollups, unsupported types, and invalid numbers.

The approved Engineering Delivery source family is the existing CR8W Engineering Delivery data source `eb498877-a74f-4abe-bac3-8d1dfbc62db8`, not the separate System Admin master sources. It remains restricted. Before any dashboard exposure or real mirror write, the server must validate a Supabase access token, confirm an active subject, and require a server-managed `engineeringDelivery` read grant or role. No such grant was created in this pass.

The approved protected Notion sync dry-run was attempted without writing mirror data. Vercel confirms `NOTION_SYNC_OPERATOR_TOKEN` and `NOTION_API_KEY` exist as Hidden Production Secrets, but `vercel env pull` supplied `[SENSITIVE]` placeholders because secret values cannot be downloaded. The resulting POST to `/api/notion-sync` returned HTTP 401 Unauthorized, so no source counts were obtained and no real write was attempted. The smallest unblock is an authorized operator providing the existing token through a secure local secret mechanism; do not rotate, print, commit, or paste the token.
