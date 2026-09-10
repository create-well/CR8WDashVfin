# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`, confirmed by project owner on 2026-09-10.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.
- Existing user changes remain uncommitted and untouched.

## Completed Slice

The dashboard accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint and reports dashboard fetch time separately from Notion mirror write time.

The explicit Vercel function `api/notion-sync.ts` owns `POST /api/notion-sync`. It reads the five confirmed Notion data sources, paginates to completion, normalizes properties while preserving stable page IDs, and defaults to dry-run. With `dryRun: false`, it writes only isolated mirror keys and writes `cr8w_notion_sync_meta` last. It never writes legacy operational keys.

The explicit route is now reachable on preview. Its authorization gate returns `401` because the preview environment does not expose one of the accepted public-key variables: `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, or `SUPABASE_ANON_KEY`.

## Blocked Action

No Notion records were read by the preview endpoint and no Supabase mirror write occurred. Do not bypass this gate by embedding the public key in server code or by using the service-role key as a client authorization token.

## Next Action

Configure one server-side public-key variable in the Vercel preview environment, preferably `SUPABASE_PUBLISHABLE_KEY`, or provide a separate protected `NOTION_SYNC_OPERATOR_TOKEN` design. Then rerun `POST /api/notion-sync` with `{ "dryRun": true }`. Keep `dryRun: false` blocked until counts are reviewed.

## Validation

- `git diff --check`: passed.
- Vite production build: passed.
- esbuild parse for `api/notion-sync.ts`: passed.
- Explicit preview route: reachable.
- Authorization behavior: correctly rejected missing preview key configuration with `401`.
- No external data mutation occurred.
