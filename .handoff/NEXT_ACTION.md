# Next Action

Deploy the feature branch to a preview and call `POST /api/server/notion-sync` without a body or with `{ "dryRun": true }`. Inspect only the response counts, `recordsSeen`, `latestSourceEdit`, and `writes`.

Acceptance criteria:

1. The preview endpoint requires the existing API authorization.
2. Dry-run returns `ok: true` and `writes: 0`.
3. Counts match the known live Notion sources closely enough to proceed.
4. No Supabase mirror keys change during dry-run.
5. Only after the dry-run response is reviewed should a real `{ "dryRun": false }` request be considered.
