# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`
- Base commit before this branch: `0d754cf0`
- Main is behind `origin/main` by two commits at handoff time.
- Working tree already contained user changes before this task. Do not restore, delete, or commit them incidentally.
- Notion workspace: `co-monny`, accessed through configured connector.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.

## Scope

Implement a small front-end reliability slice: expose Notion source freshness separately from dashboard API fetch freshness. Do not change the Notion schema, operational data, or existing user changes.

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

- Existing code reads and writes Supabase KV collections.
- Existing `SyncStatusBar` reports client fetch time, not mirror write time.
- Working tree contains tracked deletions, untracked files, and an environment file. Secrets are not recorded here.

## Validation Baseline

- `pnpm build` was attempted before this branch. Dependency installation stopped because pnpm blocked native build scripts. No source build result was established.

## Next Action

Add a backward-compatible freshness contract to the sync payload and status UI, then run focused type/build checks without staging unrelated files.
