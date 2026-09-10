# Validation

## Sync Audit

| Check | Result |
| --- | --- |
| Production read endpoint | HTTP 200 |
| Latest Vercel sync log sample | One successful `GET /api/dashboard-sync` |
| Supabase read shape | One query across operational, metadata, and mirror keys |
| Endpoint response time sample | Approximately 0.92 seconds |
| Endpoint payload size sample | Approximately 54.9 KB |
| People mirror | 13 |
| Flows mirror | 3 |
| Moves mirror | 4 |
| Content mirror | 2 |
| Money mirror | 0 |

The current runtime log sample is too small to estimate sustained polling volume. The 30-second visible-tab interval is bounded and the endpoint uses one database query, so the current design is reasonable at the verified 54.9 KB payload size. Re-measure with an active team session before changing the interval.

## Authentication Decision

The app uses Supabase Auth individual accounts. No master/admin bypass was added. A development account or separate development Supabase project is the safe route. Server credentials and the operator token remain server-side.

## Next Iteration

`NOTION_SOURCES_NEXT.md` defines the metadata-driven source registry, Money validation path, typed custom-property contract, sensitivity-aware UI, rollout checks, and payload thresholds for moving search server-side.
