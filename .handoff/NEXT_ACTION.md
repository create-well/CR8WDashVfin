# Next Action

Push the explicit `api/notion-sync.ts` route and wait for a new Vercel preview. Call `POST /api/notion-sync` with `{ "dryRun": true }` using the app's publishable-key authorization.

Acceptance criteria:

1. The preview endpoint no longer returns the legacy health response.
2. The endpoint requires authorization.
3. Dry-run returns `ok: true` and `writes: 0`.
4. Counts match the live Notion source inspection.
5. No Supabase mirror keys change during dry-run.
6. Only after the dry-run response is reviewed should a real `{ "dryRun": false }` request be considered.
