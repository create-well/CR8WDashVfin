# Create Well dashboard deployment and data boundary

This repository is the **visual implementation source** for the Create Well dashboard. It is deployed independently from the live workflow application and must not be treated as a replacement for the workflow application’s authenticated data path.

## Route contract

| Label | Primary path | Compatibility path | Purpose |
|---|---|---|---|
| This Week | `/` | — | Weekly orientation and current context |
| Moves | `/moves` | — | Active movement and stations |
| Care | `/care` | — | Consent-aware care context |
| FLOWS | `/flows` | — | Workshops, programs, and resources |
| The Source | `/money` | `/source` | Source Flow and known resource conditions |
| Decisions | `/decisions` | — | Decision queue interaction pattern |
| System | `/system` | — | Sync, contract, and route health |

The `/money` path remains for backward compatibility. **The Source** and **Source Flow** are the required user-facing terms.

## Consent and stewardship

Source Flow may be viewed and tended only by authorized stewards. The explicit roster is `monny`, `sunshine`, `bingle`, `omar`, and `pia`; matching is case-insensitive. Care is closed by default in this design deployment. Outreach, care-channel opening, and scheduling controls remain unavailable until explicit consent is recorded through an approved live workflow integration.

> The design dashboard must not imply that it can make contact, create a care channel, or record financial information in the production workflow.

## Data boundary

Every route consumes the typed dashboard context. Page components must not make direct calls to a database, Notion, or another external service. The design repository includes local interaction previews for some Source Flow and Decisions actions; those interactions are **not the operational record**. The authenticated workflow application owns live Supabase, realtime, and Notion-connected behavior.

## Deployment procedure

Install dependencies with npm, run `npm test` and `npm run build`, then review the Vercel preview before promoting a validated `main` commit. No access token, client secret, Supabase service-role key, environment file, or deployment payload may be committed to Git.

If Vercel blocks a Git-sourced deployment because it cannot attribute a commit author, connect the author’s GitHub account to the Vercel account and push a small documentation-only follow-up commit. Vercel requires a fresh commit before it will retry a blocked deployment; do not use an unreviewed application-code change solely to trigger a redeploy.
