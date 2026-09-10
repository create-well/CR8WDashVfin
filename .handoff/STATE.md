# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`
- Latest implementation commit will add the protected Notion mirror endpoint.
- The working tree contained user changes before this task. They remain uncommitted and untouched.
- Notion workspace: `co-monny`, accessed through the configured connector and the local server-only `NOTION_API_KEY` secret reference.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.

## Completed Slice

The dashboard accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint. It exposes `source`, `mirrorUpdatedAt`, `sourceLastEditedAt`, and `syncRunId` through the typed dashboard payload. The status bar separately reports dashboard fetch time and Notion mirror write time. Missing metadata is shown as unavailable, not fresh. Legacy payloads continue to render.

The deployed Vercel catch-all now has a protected `POST /api/server/notion-sync` endpoint. It reads the five confirmed Notion data sources, paginates up to completion, normalizes properties while preserving stable Notion page IDs, and defaults to dry-run. With `dryRun: false`, it writes only `cr8w_notion_mirror_people`, `cr8w_notion_mirror_flows`, `cr8w_notion_mirror_moves`, `cr8w_notion_mirror_content`, `cr8w_notion_mirror_money`, then writes `cr8w_notion_sync_meta` last. It never writes legacy operational keys.

## Known Notion Sources

- PEOPLE: `collection://b97bcbdf-2b1b-488d-9d07-4012b031732e`
- FLOWS: `collection://c1677843-dd13-4e37-9f80-e960b26847dc`
- MOVES: `collection://5597e583-f7df-4f6c-90b0-296a26c57454`
- CONTENT: `collection://cd410d33-8052-4897-8226-3a3ca84ea8bc`
- MONEY: `collection://55832c19-38fa-44cb-b4c2-0174b4c5b207`

## Current Data Facts

- FLOWS: 3 records, 1 public.
- PEOPLE: 13 records, 0 consent dates, 0 next invitations.
- MOVES: 4 records, all `Next`.
- CONTENT: 1 public published record and 1 team record with missing status.
- MONEY: currently returns zero records from the live API query.

## Risks

- The adapter is not deployed or invoked against Supabase yet. Live writes require an authenticated request with `dryRun: false`.
- The endpoint stores normalized source snapshots in the existing KV table because no dedicated mirror schema is present. This is an isolated mirror namespace, not a replacement for a relational mirror.
- Existing operational CRUD routes remain in the codebase and are outside this slice.
- Existing working tree contains tracked deletions, untracked files, and an environment file. Secrets are not recorded here.

## Validation

- `git diff --check`: passed.
- `./node_modules/.bin/vite build`: passed.
- `./node_modules/.bin/esbuild api/server/[[...path]].ts --platform=node --format=esm`: passed.
- Explicit TypeScript check was attempted but the repository's TypeScript 4.9 compiler cannot parse newer installed Node type declarations. The reported source parse issue was a pre-existing malformed iCalendar string literal; that literal was repaired and esbuild now parses the handler.
- Vitest remains unavailable in the current dependency set.
- Existing Vite warnings remain: AuthGate dynamic/static import and a large application chunk.

## Next Action

Deploy this branch to a preview, call `POST /api/server/notion-sync` with the default dry-run behavior, inspect only counts and run metadata, then decide whether to run the first real mirror write. Do not call `dryRun: false` until the preview response is verified.
