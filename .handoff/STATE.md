# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.
- Existing unrelated user changes remain uncommitted and untouched.

## Completed Backend Slice

The explicit Vercel function `api/notion-sync.ts` owns the protected operator action. It reads the five confirmed Notion data sources, paginates to completion, normalizes properties while preserving stable page IDs, defaults to dry-run, and writes isolated mirror keys only when `dryRun: false`.

The approved `NOTION_SYNC_OPERATOR_TOKEN` is stored as a hidden Vercel Preview Secret. The verified real write created the five mirror keys and `cr8w_notion_sync_meta` with PEOPLE 13, FLOWS 3, MOVES 4, CONTENT 2, and MONEY 0.

## Completed UI Slice

Added `api/dashboard-sync.ts`, a read-only Supabase-backed function that returns the existing operational dashboard collections, `notionMirrors`, and sanitized freshness metadata in one payload. It reads `cr8w_notion_sync_meta` and all five `cr8w_notion_mirror_*` keys.

Updated `src/app/components/api.ts` so `sync()` calls `/api/dashboard-sync` instead of the unreliable nested `/api/server/sync` route. Added typed `NotionMirrorRecord` and `NotionMirrors` contracts.

Updated `DashboardContext` and `DashboardPayload` to retain mirror collections. Added `NotionMirrorSummary` to the team home page. It displays counts for People, Flows, Moves, Content, and Money, plus representative source-linked records and mirror freshness.

## Validation

- `./node_modules/.bin/vite build`: passed.
- `./node_modules/.bin/esbuild api/dashboard-sync.ts --platform=node --format=esm`: passed.
- `git diff --check`: passed.
- Existing Vite warnings remain: AuthGate dynamic/static import and a large application chunk.

## Next Action

Commit and push the scoped UI slice. Deploy a preview and verify `GET /api/dashboard-sync` returns freshness plus mirror counts, then inspect the dashboard preview for the Notion mirror panel.
