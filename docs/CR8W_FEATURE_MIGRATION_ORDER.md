# CR8W Feature Migration Order

## Current slice

The first mounted slice is `src/features/coflow/CoFlowUpcomingFeature.tsx`, rendered by the lazy `CarePage` route. It adapts the extracted `UpcomingDates` component to the existing `DashboardContext` boundary and preserves the existing `CoFlowD8sView` during the incremental migration. `SyncProvider` is mounted above `DashboardProvider` and now owns the single polling lifecycle; `DashboardContext` projects the shared payload into its compatibility state.

## Recommended order

| Order | Scope | Files | Migration boundary | Exit criteria |
|---|---|---|---|---|
| 1 | CoFlow read-only presentation | `coflow/CoFlowUpcomingFeature.tsx`, `coflow/components/UpcomingDates.tsx`, `coflow/utils.ts` | Already mounted on `CarePage`; keep `DashboardContext` as the data and mutation adapter. | Care route E2E shows upcoming dates and calendar state without duplicate polling. |
| 2 | CoFlow date editing | `coflow/components/DateCard.tsx`, `AddDateModal.tsx`, `AgendaEditor.tsx`, `ArchivedDates.tsx` | Reuse existing CoFlow actions; migrate one mutation surface at a time. | Add/update/archive/delete tests preserve optimistic state and system messages. |
| 3 | CoFlow check-ins | `CheckInForm.tsx`, `CheckInList.tsx`, `coflow/actions.ts` | Replace the corresponding `DashboardContext` action calls with the extracted action factory. | Check-in create/delete and retry behavior pass unit and Care-route E2E tests. |
| 4 | Geyser tasks and stations | `geyser/components/Task*`, `Station*`, `InlineEdit.tsx`, `geyser/actions` | Move task/station action adapters first, then presentational cards. | Moves route keeps inline edit, optimistic update, and error rollback behavior. |
| 5 | Geyser forum | `ForumSection.tsx`, `ForumPostCard.tsx`, `forum/actions.ts` | Migrate posts and replies after task/station state boundaries are stable. | Forum create/edit/delete/reply flows pass authenticated E2E tests. |
| 6 | Workshops | `workshops/components/**`, `workshops/actions.ts`, `workshops/types.ts` | Migrate pipeline and program/resource editors before calendar integration. | Flows route covers drag/update/add/delete and program/resource operations. |
| 7 | Hub presentation | `hub/components/**`, `hub/utils.tsx` | Replace HubView subtrees incrementally; preserve dashboard-level navigation callbacks. | Home route visual and interaction smoke tests remain stable. |
| 8 | Messages | `messages/context.tsx`, `messages/components/**`, `messages/actions.ts` | Migrate the message context after the shared sync payload and optimistic actions are stable. | Message drawer, reactions, composer, and deduplication pass E2E coverage. |
| 9 | Supporting API/type cleanup | `src/api/types.ts`, `api/notion-source-metadata.ts`, content/station/task actions | Remove duplicate types and add endpoint tests only after consumers are migrated. | No `figma:asset` imports, no absolute-path migration scripts, and all endpoint contracts are typed. |

## Known blockers

The feature tree contains unresolved `figma:asset` imports in hub and messages modules. `coflow/fix_paths.py` contains machine-specific absolute paths and is migration tooling, not runtime code. The feature modules are not yet imported by the active app except for the first CoFlow slice. The remaining migration should not be committed as one bulk change.
