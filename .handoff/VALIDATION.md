# Validation

## Final Result

The approved separate `NOTION_SYNC_OPERATOR_TOKEN` design is active in Vercel Preview. The operator token is stored as a hidden Preview Secret and is not present in source control.

The dry-run request passed with `writes: 0`, `recordsSeen: 22`, and counts of PEOPLE 13, FLOWS 3, MOVES 4, CONTENT 2, and MONEY 0.

The approved real request passed with `dryRun: false`, `writes: 6`, `recordsSeen: 22`, and the same counts. Run ID: `notion-1789043618742-1b5bad40`.

Direct Supabase REST verification confirmed the five isolated mirror keys and `cr8w_notion_sync_meta` are present. The stored metadata reports `source: notion`, `mirrorUpdatedAt: 2026-09-10T12:33:42.193Z`, `sourceLastEditedAt: 2026-09-10T11:33:00.000Z`, and the verified run ID.

## Passed

- Vite production build.
- Esbuild parse for `api/notion-sync.ts`.
- Dry-run source counts.
- Real Notion read and isolated Supabase mirror write.
- Direct Supabase count and freshness verification.
- No legacy operational keys written.
- Temporary diagnostic scripts removed.
- Temporary local operator-token file removed.

## Existing Gaps

The repository has no project `tsconfig*.json`; the installed TypeScript 4.9 compiler cannot parse newer Node declaration syntax. Vitest is not installed. Existing Vite warnings remain for the AuthGate import pattern and the large application chunk. The existing `/api/server/*` route still returns the legacy health response for nested paths; `/api/notion-sync` is the canonical operator endpoint.
