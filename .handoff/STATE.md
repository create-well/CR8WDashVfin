# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- The working tree contained user changes before this task. They remain uncommitted and untouched.
- Notion workspace: `co-monny`, accessed through the configured connector and the local server-only `NOTION_API_KEY` secret reference.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.

## Completed Slice

The dashboard accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint. It exposes `source`, `mirrorUpdatedAt`, `sourceLastEditedAt`, and `syncRunId` through the typed dashboard payload. The status bar separately reports dashboard fetch time and Notion mirror write time. Missing metadata is shown as unavailable, not fresh.

The explicit Vercel function `api/notion-sync.ts` now owns `POST /api/notion-sync`. It reads the five confirmed Notion data sources, paginates to completion, normalizes properties while preserving stable page IDs, and defaults to dry-run. With `dryRun: false`, it writes only isolated mirror keys and writes `cr8w_notion_sync_meta` last. It never writes legacy operational keys.

The earlier `/api/server/notion-sync` route attempt was not usable because this project routes `/api/server/*` through the exact handler without reliable nested path variables. The new explicit route removes that ambiguity. The existing server handler retains freshness response support.

## Preview Finding

The first two preview attempts to `/api/server/notion-sync` returned the legacy health response. No mirror write occurred. The explicit route is ready for the next preview deployment.

## Risks

- The adapter is not deployed or invoked against Supabase yet. Live writes require an authenticated request with `dryRun: false`.
- The endpoint stores normalized source snapshots in the existing KV table because no dedicated mirror schema is present. This is an isolated mirror namespace, not a replacement for a relational mirror.
- Existing operational CRUD routes remain in the codebase and are outside this slice.
- Existing working tree contains tracked deletions, untracked files, and an environment file. Secrets are not recorded here.

## Validation

- `git diff --check`: passed.
- `./node_modules/.bin/vite build`: passed after the explicit route was added.
- `./node_modules/.bin/esbuild api/notion-sync.ts --platform=node --format=esm`: passed.
- Existing handlers also parse with esbuild after the iCalendar literal repair.
- Live Notion API schema inspection passed for PEOPLE, FLOWS, MOVES, CONTENT, and MONEY.
- Existing Vite warnings remain: AuthGate dynamic/static import and a large application chunk.

## Next Action

Push the explicit route, wait for the new preview, then call `POST /api/notion-sync` with `{ "dryRun": true }` using the app publishable key. Do not call `dryRun: false` yet.
