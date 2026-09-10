# Next Action

Inspect the deployed sync path and server-side secret names, then implement a bounded Notion-to-Supabase mirror adapter that writes `cr8w_notion_sync_meta` only after durable mirror writes succeed.

Acceptance criteria:

1. Notion credentials remain server-side and are never logged.
2. The adapter uses stable Notion page IDs.
3. The adapter supports dry-run or preview behavior before writes.
4. Mirror metadata is written after successful data writes.
5. The dashboard displays a real Notion mirror timestamp after the first successful run.
6. Existing user changes remain untouched.
