# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`
- The branch is pushed to GitHub.
- The Vercel project is `cr8w-dash-vfin`.
- The working tree contained user changes before this task. They remain uncommitted and untouched.
- Notion workspace: `co-monny`, accessed through the configured connector and the local server-only `NOTION_API_KEY` secret reference.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.

## Completed Slice

The dashboard accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint. It exposes `source`, `mirrorUpdatedAt`, `sourceLastEditedAt`, and `syncRunId` through the typed dashboard payload. The status bar separately reports dashboard fetch time and Notion mirror write time. Missing metadata is shown as unavailable, not fresh.

The Vercel `api/server.ts` handler now owns the protected `POST /api/server/notion-sync` endpoint. The endpoint reads the five confirmed Notion data sources, paginates to completion, normalizes properties while preserving stable page IDs, and defaults to dry-run. With `dryRun: false`, it writes only isolated mirror keys and writes `cr8w_notion_sync_meta` last. It never writes legacy operational keys.

The Vercel catch-all also contains the same endpoint and freshness response path, but preview testing showed that the exact deployed route resolves through `api/server.ts`. Both handlers now parse successfully.

## Preview Finding

The first preview deployment was READY, but `/api/server/notion-sync` returned the legacy health response because the exact route was handled by `api/server.ts`, not the catch-all. The endpoint was added to `api/server.ts` before any mirror write was attempted. A new preview is required after the follow-up commit.

## Risks

- The adapter is not deployed or invoked against Supabase yet. Live writes require an authenticated request with `dryRun: false`.
- The endpoint stores normalized source snapshots in the existing KV table because no dedicated mirror schema is present. This is an isolated mirror namespace, not a replacement for a relational mirror.
- Existing operational CRUD routes remain in the codebase and are outside this slice.
- Existing working tree contains tracked deletions, untracked files, and an environment file. Secrets are not recorded here.

## Validation

- `git diff --check`: passed.
- `./node_modules/.bin/vite build`: passed.
- `./node_modules/.bin/esbuild api/server.ts --platform=node --format=esm`: passed.
- `./node_modules/.bin/esbuild api/server/[[...path]].ts --platform=node --format=esm`: passed.
- Live Notion API schema inspection passed for PEOPLE, FLOWS, MOVES, CONTENT, and MONEY.
- First preview route check proved the endpoint routing issue and no mirror write occurred.
- Existing Vite warnings remain: AuthGate dynamic/static import and a large application chunk.

## Next Action

Push the route correction, wait for the new preview, call the endpoint with `{ "dryRun": true }` using the app's existing publishable-key authorization, and inspect counts only. Do not call `dryRun: false` yet.
