# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`
- Freshness commit: `579f99a`
- Main was behind `origin/main` by two commits at handoff time.
- The working tree contained user changes before this task. They remain uncommitted and untouched.
- Notion workspace: `co-monny`, accessed through the configured connector.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.

## Completed Slice

The dashboard now accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint. It exposes `source`, `mirrorUpdatedAt`, `sourceLastEditedAt`, and `syncRunId` through the typed dashboard payload. The status bar separately reports dashboard fetch time and Notion mirror write time. Missing metadata is shown as unavailable, not fresh. Legacy payloads continue to render.

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

## Risks

- Existing code still reads and writes legacy Supabase KV collections. This slice only makes mirror freshness visible; it does not remove operational CRUD.
- No `cr8w_notion_sync_meta` record is known to exist yet, so the UI will correctly show mirror freshness as unavailable until the sync worker writes it.
- Existing working tree contains tracked deletions, untracked files, and an environment file. Secrets are not recorded here.

## Validation

- `git diff --cached --check`: passed before commit.
- `./node_modules/.bin/vite build`: passed.
- Build warnings: existing large application chunk and existing AuthGate dynamic/static import warning.
- Vitest: unavailable in the current dependency set.
- TypeScript: compiler exists, but the repository has no `tsconfig*.json`, so no project typecheck is configured.

## Next Action

Implement the server-side Notion mirror worker or adapter that writes `cr8w_notion_sync_meta` after a durable mirror update. Do not change Notion data or schema. First inspect the canonical deployed sync path and available server secrets.
