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

The dashboard frontend reads `/api/dashboard-sync`, propagates `notionMirrors` through `DashboardContext`, and renders `NotionMirrorSummary` on the team home page.

## Automatic Refresh and Discovery

The frontend polls the dashboard sync endpoint every 30 seconds while the tab is visible. It uses jitter, backs off after failures up to five minutes, slows to two minutes while hidden, and triggers an immediate refresh when the tab becomes visible again.

The Notion panel supports source filters across People, Flows, Moves, Content, Money, and All sources. Search is case-insensitive across source name, page ID, extracted record label, and serialized property values. Results are capped at 12 rendered cards.

## Production and Sync Audit

Production deployment `dpl_5mmuZVWDdLY64A8ztodh5srZ4E9r` is Ready and aliased to `https://www.cr8w.com`.

The latest Vercel runtime log sample showed one successful `GET /api/dashboard-sync` request with HTTP 200. This confirms successful reads but is not enough to estimate sustained polling volume because no long-running browser session was active during the log window.

A direct Supabase mirror audit confirmed:

| Mirror key | Records |
| --- | ---: |
| `cr8w_notion_mirror_people` | 13 |
| `cr8w_notion_mirror_flows` | 3 |
| `cr8w_notion_mirror_moves` | 4 |
| `cr8w_notion_mirror_content` | 2 |
| `cr8w_notion_mirror_money` | 0 |

The sync metadata reports `source: notion`, `mirrorUpdatedAt: 2026-09-10T12:33:42.193Z`, `sourceLastEditedAt: 2026-09-10T11:33:00.000Z`, and the verified run ID. A production endpoint sample returned HTTP 200 in approximately 0.92 seconds with a 54.9 KB payload. The read function uses one Supabase query for the operational keys, freshness metadata, and mirror keys.

## Authentication Boundary

The application uses individual Supabase email/password accounts. No master password, hard-coded admin credential, or bypass is present. Do not add one. Use a dedicated development account through Register, or use a separate Supabase development project with a seeded test user. Server credentials and operator tokens must remain server-side and secret.

## Next Notion Source Iteration

The detailed plan is in `.handoff/NOTION_SOURCES_NEXT.md`. The recommended next step is a metadata-driven source registry. Money is already configured but has zero records, so validate its Notion data-source access and schema before changing the UI. Custom properties should move toward a backward-compatible typed property envelope, with sensitivity-aware display maps for financial data.

## Existing Unrelated Working-Tree Changes

The following remain unstaged and untouched: `pnpm-workspace.yaml`, legacy import deletions, `.env.production`, and unrelated untracked source/test files.
