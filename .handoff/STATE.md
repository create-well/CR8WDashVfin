# CR8W Dashboard State

## Confirmed State

- Repository: `create-well/CR8WDashVfin`
- Production role: deployed source for `cr8w.com`.
- Current branch: `feat/notion-freshness-contract`, pushed to GitHub.
- Vercel project: `cr8w-dash-vfin`.
- Notion owns operational truth. Supabase is the read-only mirror plus auth, calendar tokens, and intake staging.
- Existing unrelated user changes remain uncommitted and untouched.

## Money Notion API Test

The Money data source was accessed successfully through the Notion API. Data-source ID: `55832c19-38fa-44cb-b4c2-0174b4c5b207`. The API returned object type `data_source`, title `MONEY`, and database ID `acc5fe2f-deca-4f89-89e1-79e32ddbc24d`.

The schema contains Name (title), Amount (number), Kind (select), Direction (select), Stage (select), Actual (date), Expected (date), Owner (relation), Flow (relation), Person or Org (relation), Doc (url), and ID (unique ID).

Two clearly labeled reversible development records were created and verified through the Notion API:

| Record | Amount | Page ID |
| --- | ---: | --- |
| [DEV SAMPLE] Money income test | 123.45 | `3d724acf-799d-812e-b26f-fb8a6d07e953` |
| [DEV SAMPLE] Money expense test | -67.89 | `3d724acf-799d-817d-baaf-eac706a5abd6` |

These samples exist in Notion. They have not been written to the Supabase mirror by this task because the protected production operator token was not used. The next safe step is a dry-run operator sync, followed by a deliberate mirror refresh if the result is correct.

## Source Registry Implementation

Added `api/notion-sources.ts` as the shared metadata-driven registry. Each source now declares its data-source ID, display label, enabled state, display fields, and sensitivity level. Both `api/notion-sync.ts` and `api/dashboard-sync.ts` derive their enabled source list and mirror keys from this registry.

The Notion normalizer now handles Checkbox values as booleans and Number values as finite numbers or null. A schema scan found Checkbox properties in Flows (`Public?`) and Content (`Final?`), and Number properties in Flows (`Capacity`) and Money (`Amount`).

## Validation

- Notion API Money schema request: passed.
- Notion API Money query before samples: passed with zero records.
- Notion API sample creation: passed for two records.
- Notion API sample query after creation: passed with two records and numeric Amount values.
- Registered-source Checkbox and Number schema scan: passed.
- Vite production build: passed.
- Esbuild parsing for `api/notion-sync.ts` and `api/dashboard-sync.ts`: passed.
- No temporary inspector scripts remain.

## Existing Production State

Production remains on deployment `dpl_5mmuZVWDdLY64A8ztodh5srZ4E9r` until this registry change is deployed. Existing production mirror counts remain People 13, Flows 3, Moves 4, Content 2, Money 0 until the operator sync runs again.

## Existing Unrelated Working-Tree Changes

The following remain unstaged and untouched: `pnpm-workspace.yaml`, legacy import deletions, `.env.production`, and unrelated untracked source/test files.
