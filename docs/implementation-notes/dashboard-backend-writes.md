# Dashboard backend writes

## Live and repository audit

The live reference is `https://www.cr8w.com/`. A live HTML capture is available in the shared project files, but direct live fetching was unavailable in this environment. The capture and repository show the existing CR8W visual language: warm cream surfaces, sage and lavender accents, compact dashboard views, and existing sync/status UI. The current repository is a Vite React app with a Vercel catch-all API route and an existing Supabase-backed read/write API.

The public CR8W brand surface and authenticated dashboard are treated as separate experiences. This pass changes only the existing dashboard write path. It does not redesign the public site, add `/app`, create a client portal, or create share links.

## Plan

1. Add one typed client-side mutation boundary for dashboard records.
2. Validate task, content-item, and approval payloads at the boundary without adding database credentials or changing Supabase.
3. Preserve the current API route and UI styling while moving task and content mutations through the boundary.
4. Keep explicit mock behavior for local development through the existing API base and fallback model.
5. Add rollback and status reporting for optimistic updates.
6. Add pure tests for validation, success, failure, and rollback behavior.

## Assumptions

- The existing `/api/server` route remains the backend boundary for this pass.
- `Task` is the current project/task record, `ForumPost` is the current content-item record, and the Decisions page is the current approval-like UI.
- There is no approved Supabase schema or permission contract for new project or approval records. No new database route is added in this pass.
- The existing browser auth gate and server-side credentials remain unchanged.
- Soft archive means the existing delete API is not called by the new boundary; archive/status changes use an update payload when the record type supports it.

## Blocked or deferred

- Supabase schema, RLS, auth changes, and migrations are deferred until this frontend boundary is reviewed.
- Persisting DecisionsPage approvals requires an approved record schema and API contract; the existing page remains local-only in this pass.
- Production deployment is intentionally not performed.

## Validation targets

- `pnpm run lint` if configured, otherwise report unavailable.
- `pnpm run typecheck` if configured, otherwise report unavailable.
- `pnpm test` for boundary tests.
- `pnpm run build`.
- Targeted secret scan over tracked files.
