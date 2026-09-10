# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.
- Existing user changes remain uncommitted and untouched.

## Completed Slice

The dashboard accepts optional `cr8w_notion_sync_meta` metadata from the sync endpoint and reports dashboard fetch time separately from Notion mirror write time.

The explicit Vercel function `api/notion-sync.ts` owns `POST /api/notion-sync`. It reads the five confirmed Notion data sources, paginates to completion, normalizes properties while preserving stable page IDs, and defaults to dry-run. With `dryRun: false`, it writes only isolated mirror keys and writes `cr8w_notion_sync_meta` last. It never writes legacy operational keys.

The approved authentication design is a separate `NOTION_SYNC_OPERATOR_TOKEN` stored as a Vercel Preview Secret. It is not derived from Supabase public authentication and is not committed to the repository. The temporary local token file used for the request was removed after verification.

## Verified Real Write

Preview deployment: `cr8w-dash-vfin-dz9qus2bf-monnylog.vercel.app`

Run ID: `notion-1789043618742-1b5bad40`

The approved request returned `ok: true`, `dryRun: false`, `recordsSeen: 22`, and `writes: 6`. Direct Supabase verification confirmed these keys exist:

| Mirror key | Records |
| --- | ---: |
| `cr8w_notion_mirror_people` | 13 |
| `cr8w_notion_mirror_flows` | 3 |
| `cr8w_notion_mirror_moves` | 4 |
| `cr8w_notion_mirror_content` | 2 |
| `cr8w_notion_mirror_money` | 0 |

Freshness metadata is present in `cr8w_notion_sync_meta` with `source: notion`, `mirrorUpdatedAt: 2026-09-10T12:33:42.193Z`, `sourceLastEditedAt: 2026-09-10T11:33:00.000Z`, and the run ID above.

## Risks

The source snapshots are stored in the existing KV table because no dedicated relational mirror schema is present. This is an isolated mirror namespace, not a replacement for relational modeling. The dashboard’s old `/api/server/*` route still collapses nested paths to the legacy handler, so the explicit `/api/notion-sync` route is the canonical operator endpoint.

## Validation

Vite production build passed. Esbuild parsing passed for the explicit function and existing handlers. The dry-run passed with `writes: 0` and counts matching the real write. The real write passed and direct Supabase verification matched all counts and freshness metadata. No legacy operational keys were written.

## Next Action

Stop write testing for this task. The next bounded slice is to make the dashboard’s existing sync response read `cr8w_notion_sync_meta` through the exact deployed handler or to add a dedicated read endpoint, then verify the UI status bar against the stored freshness metadata.
