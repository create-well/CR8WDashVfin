# Validation

## Production

| Check | Result |
| --- | --- |
| Registry deployment | Ready |
| Deployment ID | `dpl_GskSjJ3nLg2jYeiWAUXK2K4Gf9ue` |
| Production alias | `https://www.cr8w.com` |
| Source registry included | Yes |
| Checkbox normalization included | Yes |
| Number normalization included | Yes |

## Protected Sync

The protected Notion operator request was not executed because Vercel does not permit production secret values to be pulled by `vercel env pull`. The endpoint still requires `NOTION_SYNC_OPERATOR_TOKEN`. No bypass, shared password, or secret exposure was used.

The Money sample records were verified directly through the Notion API, but the Supabase Money mirror remains at 0 until the protected sync runs.

## Handoff

`AI_HANDOFF_PROMPT.md` is complete and includes the exact safe continuation sequence for dry-run, real mirror refresh, verification, cleanup, and performance checks.
