# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.
- Existing unrelated user changes remain uncommitted and untouched.

## Completed Integration

The protected `api/notion-sync.ts` operator action writes the isolated Notion mirror keys. The read-only `api/dashboard-sync.ts` function returns operational dashboard data, all five Notion mirror collections, and freshness metadata from Supabase.

The dashboard frontend now reads `/api/dashboard-sync`, propagates `notionMirrors` through `DashboardContext`, and renders `NotionMirrorSummary` on the team home page.

## Automatic Refresh

The frontend polls the dashboard sync endpoint every 30 seconds while the tab is visible. It uses a small random jitter to avoid synchronized request bursts, backs off after failures up to five minutes, slows to two minutes while the tab is hidden, and triggers an immediate refresh when the tab becomes visible again.

This is bounded polling, not a webhook. The current source-of-truth workflow remains safe because the dashboard reads the existing Supabase mirror and never writes to Notion from the browser.

## Filtering and Search

The Notion mirror panel supports source filters for People, Flows, Moves, Content, Money, and All sources. It also supports case-insensitive full-text search across source, stable page ID, extracted record label, and serialized property values. Results are capped at 12 rendered cards to keep the panel responsive while showing the total match count.

## Production Deployment

Production deployment succeeded after adding a pnpm 10-compatible `pnpm-lock.yaml`. The first production attempt failed because Vercel’s frozen pnpm install detected a lockfile override mismatch. The lockfile was regenerated with pnpm 10, passed a local frozen install, committed, and redeployed.

Production deployment: `dpl_5mmuZVWDdLY64A8ztodh5srZ4E9r`

Production aliases:

- `https://www.cr8w.com`
- `https://cr8w-dash-vfin.vercel.app`
- `https://cr8w-dash-vfin-monnylog.vercel.app`

## Live Verification

- Vercel status: Ready.
- `https://www.cr8w.com/`: HTTP 200.
- `GET https://www.cr8w.com/api/dashboard-sync`: passed.
- Freshness source: `notion`.
- Mirror counts: PEOPLE 13, FLOWS 3, MOVES 4, CONTENT 2, MONEY 0.
- Production functions deployed: `api/dashboard-sync`, `api/notion-sync`, `api/server`, and `api/server/[[...path]]`.

## Validation

- Vite production build passed.
- Esbuild parsing passed for dashboard-sync and notion-sync.
- pnpm 10 frozen install passed.
- Production deployment reached Ready.
- Production homepage and read endpoint passed.

## Existing Unrelated Working-Tree Changes

The following remain unstaged and untouched: `pnpm-workspace.yaml`, legacy import deletions, `.env.production`, and unrelated untracked source/test files.
