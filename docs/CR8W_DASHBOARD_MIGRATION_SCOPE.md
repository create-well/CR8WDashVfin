# CR8W Dashboard Migration Scope

## Decision

The route replacement, sync-provider extraction, and feature-module tree are tracked as a dedicated migration scope. They are **not yet included in the production deployment boundary** because the feature tree is not currently imported by the active application.

## Scope

| Area | Files | Current state |
|---|---|---|
| Lazy route manifest | `src/app/routes.tsx`, replacement for `src/app/routes.ts` | Active through `App.tsx`; lazy page routes build successfully. |
| Sync lifecycle extraction | `src/contexts/SyncProvider.tsx` | Implemented but not mounted by `App.tsx`; `DashboardContext` remains the active sync owner. |
| Feature modules | `src/features/**` | 56 files present, but no active application imports currently reference the tree. |
| Supporting types and endpoints | `src/api/types.ts`, `api/notion-source-metadata.ts` | Present but not part of the active route/provider graph. |
| Migration E2E | `e2e/migration.spec.ts` | Covers authenticated home rendering, lazy route resolution, and route navigation. |

## Validation

The current checkout passes the unit suite and production build. The Playwright suite validates the route replacement and authentication entrypoint; the route-manifest test is deterministic when run in isolation and should be rerun as part of the final migration integration pass.

The active application still uses `DashboardProvider` for synchronization. The next migration step is to mount `SyncProvider` and move one feature surface at a time behind the route manifest, with focused tests for data ownership and authentication boundaries.

## Commit boundary

Do not commit the full `src/features/**` tree as production behavior until it is mounted, type-checked through the active graph, and covered by route-level E2E checks. Keep it scoped for a dedicated follow-up migration rather than combining it with Notion mirror or legacy-asset cleanup.
