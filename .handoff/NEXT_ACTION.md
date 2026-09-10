# Next Action

Push the route correction and wait for a new Vercel preview. Call `POST /api/server/notion-sync` without a body or with `{ "dryRun": true }` using the app's existing publishable-key authorization.

Acceptance criteria:

1. The preview endpoint no longer returns the legacy health response.
2. The endpoint requires authorization.
3. Dry-run returns `ok: true` and `writes: 0`.
4. Counts are visible without returning page content.
5. No Supabase mirror keys change during dry-run.
6. Only after the dry-run response is reviewed should a real `{ "dryRun": false }` request be considered.
