# Next Action

Configure the Vercel preview environment with `SUPABASE_PUBLISHABLE_KEY`, or approve a separate protected `NOTION_SYNC_OPERATOR_TOKEN` design. Then redeploy the preview and call `POST /api/notion-sync` with `{ "dryRun": true }`.

Acceptance criteria:

1. The endpoint returns `ok: true`.
2. The response reports `writes: 0`.
3. Counts match the live Notion source inspection.
4. No Supabase mirror keys change during dry-run.
5. A real `{ "dryRun": false }` request remains blocked until the dry-run counts are reviewed.
