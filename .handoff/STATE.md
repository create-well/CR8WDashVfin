# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read mirror plus auth, calendar tokens, intake staging, and existing dashboard records.
- Existing unrelated user changes remain uncommitted and untouched.

## Production Registry Deployment

The metadata-driven source registry and explicit Checkbox/Number normalization were deployed successfully.

- Deployment: `dpl_GskSjJ3nLg2jYeiWAUXK2K4Gf9ue`
- Preview URL: `https://cr8w-dash-vfin-a79zhlqbk-monnylog.vercel.app`
- Production alias: `https://www.cr8w.com`
- Status: Ready

## Pending Protected Sync

The production operator endpoint remains protected by `NOTION_SYNC_OPERATOR_TOKEN`. Vercel does not allow secret values to be pulled from the production environment, so the current agent could not run the operator request without the operator token value. No credential was printed or weakened.

The two verified Notion Money samples remain in Notion and have not been copied to Supabase yet:

- `[DEV SAMPLE] Money income test`, amount `123.45`, page ID `3d724acf-799d-812e-b26f-fb8a6d07e953`
- `[DEV SAMPLE] Money expense test`, amount `-67.89`, page ID `3d724acf-799d-817d-baaf-eac706a5abd6`

## Current mirror state before pending sync

- People: 13
- Flows: 3
- Moves: 4
- Content: 2
- Money: 0

## Handoff Prompt

`AI_HANDOFF_PROMPT.md` contains the optimized continuation prompt with the product goal, source-of-truth boundary, registry, secure auth rules, sample IDs, deployment sequence, verification commands, and performance thresholds.

## Existing Unrelated Working-Tree Changes

The following remain unstaged and untouched: `pnpm-workspace.yaml`, legacy import deletions, `.env.production`, and unrelated untracked source/test files.
