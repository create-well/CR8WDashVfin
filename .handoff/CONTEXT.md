# CR8W Dashboard Context

## System boundary

The dashboard is a Vercel-hosted React application. Notion is the operational human write surface and source of truth. Supabase provides structured runtime persistence and cache behavior. The browser receives typed dashboard data, not raw Notion objects.

## Authentication boundary

The browser uses the injected `VITE_SUPABASE_PUBLISHABLE_KEY`. Server runtime uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` according to the existing code contract. Values never belong in source, prompts, handoff files, logs, or client bundles when server-only.

## Sync boundary

The sync path should normalize Notion records, preserve stable source IDs, retry transient failures with bounded backoff, checkpoint only after durable writes, and retain last-known-good data in the UI. Use signed webhooks when available; otherwise use bounded polling with a durable cursor and periodic reconciliation.

## Hosting decisions

Keep the current stateless Vercel request path unless measured requirements justify a durable workflow or coordination service. Use Workflow for resumable multi-step execution and Durable Objects for per-entity coordination or persistent connections, not as a default database replacement.

## API rules

Preserve `/api/server?path=...` compatibility. Keep authentication fail-closed, use consistent error responses, and document any contract change before implementation.

## Prohibited actions

Do not mutate Notion schemas or records, delete data, expose secrets, introduce a hidden second database, or force-push history.
