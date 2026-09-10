# Validation

## Production Deployment

| Check | Result |
| --- | --- |
| Final deployment | Ready |
| Deployment ID | `dpl_G3Q5A9w4LQzXNTXn9ahEoDhTQW4K` |
| Production alias | `https://www.cr8w.com` |
| Registry included | Yes |
| Parallel source reads included | Yes |

## Protected Notion Sync

The production operator initially failed because the registry import needed an explicit `.js` extension for Vercel ESM resolution. After that fix, the function exceeded the execution window because five sources were queried sequentially. Source reads were changed to `Promise.all`, then the function passed.

The dry-run returned 24 records with Money count 2. The approved real write returned HTTP 200, run ID `notion-1789046614763-04fbf8ed`, and 6 writes.

## Supabase Read Verification

`GET /api/dashboard-sync` returned HTTP 200. Mirror counts were People 13, Flows 3, Moves 4, Content 2, and Money 2. Freshness source was Notion, and `mirrorUpdatedAt` was `2026-09-10T13:23:36.781Z`.

Money Amount values were verified as numbers: `123.45` and `-67.89`.

## Security

A new random operator token was stored as a Vercel Production Secret. The local temporary token file was removed after use. No token value was printed, committed, or placed in the handoff prompt.

## Handoff

`AI_HANDOFF_PROMPT.md` is complete and updated with the successful sync state.
