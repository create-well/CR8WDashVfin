# CR8W Dashboard AI Handoff Prompt

You are continuing work on `create-well/CR8WDashVfin`, the deployed internal Create Well team dashboard at `https://www.cr8w.com`.

## Product goal

Build a calm, fast, trustworthy team dashboard for Create Well. The frontend is optimized for team use. Notion is the operational source of truth. Supabase stores the read mirror, authentication data, calendar tokens, intake staging, and existing dashboard records. The browser must never write operational records directly to Notion.

The dashboard should make the current state easy to see without asking the team to manage another database. Every synchronized view must show freshness clearly and must avoid presenting stale mirror data as current.

## Repository and deployment

- Repository: `create-well/CR8WDashVfin`
- Local path: `/Users/monicablanco/Documents/GitHub/CR8WDashVfin`
- Production domain: `https://www.cr8w.com`
- Vercel project: `cr8w-dash-vfin`
- Active branch: `feat/notion-freshness-contract`
- Last implementation commit: `ca76e7f2`
- Latest production deployment: `dpl_G3Q5A9w4LQzXNTXn9ahEoDhTQW4K`
- Do not stage or overwrite unrelated existing working-tree changes.

## Source-of-truth boundary

Notion owns operational truth. The protected server operator `api/notion-sync.ts` reads registered Notion data sources and writes isolated Supabase KV mirror keys. The read-only `api/dashboard-sync.ts` endpoint reads those mirror keys and returns dashboard data plus freshness metadata. The frontend polls the read endpoint while visible and never receives server credentials.

The protected write endpoint requires:

```text
Authorization: Bearer <NOTION_SYNC_OPERATOR_TOKEN>
```

Never create a master password, hard-coded admin bypass, shared credential, or frontend secret. Use Supabase Auth individual accounts for human access. Keep `NOTION_API_KEY`, `NOTION_SYNC_OPERATOR_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_SECRET_KEY` server-side.

## Current source registry

The shared registry is in `api/notion-sources.ts`. It defines each source’s data-source ID, display label, enabled state, display fields, and sensitivity level. `api/notion-sync.ts` and `api/dashboard-sync.ts` derive their source lists and mirror keys from this registry.

Registered sources:

| Source | Data-source ID | Mirror key | Sensitivity |
| --- | --- | --- | --- |
| People | `b97bcbdf-2b1b-488d-9d07-4012b031732e` | `cr8w_notion_mirror_people` | team |
| Flows | `c1677843-dd13-4e37-9f80-e960b26847dc` | `cr8w_notion_mirror_flows` | team |
| Moves | `5597e583-f7df-4f6c-90b0-296a26c57454` | `cr8w_notion_mirror_moves` | team |
| Content | `cd410d33-8052-4897-8226-3a3ca84ea8bc` | `cr8w_notion_mirror_content` | team |
| Money | `55832c19-38fa-44cb-b4c2-0174b4c5b207` | `cr8w_notion_mirror_money` | restricted |

## Current normalization

`api/notion-sync.ts` explicitly normalizes Checkbox to boolean and Number to finite number or null. Existing handling covers title, rich text, select, status, multi-select, date, people, relation, unique ID, formula, and rollup.

Live schema evidence:

- Flows has Checkbox `Public?` and Number `Capacity`.
- Content has Checkbox `Final?`.
- Money has Number `Amount`.

## Money test data

The Money data source was initially empty. Two clearly labeled development records were added through the Notion API:

- `[DEV SAMPLE] Money income test`, amount `123.45`, page ID `3d724acf-799d-812e-b26f-fb8a6d07e953`
- `[DEV SAMPLE] Money expense test`, amount `-67.89`, page ID `3d724acf-799d-817d-baaf-eac706a5abd6`

They were verified through a follow-up Notion API query and are now copied into Supabase through the protected operator sync.

## Current mirror state after the verified sync

- People: 13
- Flows: 3
- Moves: 4
- Content: 2
- Money: 2

The verified sync run was `notion-1789046614763-04fbf8ed`. Its `mirrorUpdatedAt` is `2026-09-10T13:23:36.781Z`, and `GET /api/dashboard-sync` reports Money count 2.

## Frontend behavior

The dashboard polls `/api/dashboard-sync` every 30 seconds while the tab is visible. It slows while hidden, backs off after errors, and refreshes immediately when visible again. The Notion mirror panel supports source filters and case-insensitive search. Keep the current client-side search model while the payload remains small.

## Completed release sequence

1. Production deployment reached Ready.
2. The protected dry-run returned 24 records with Money count 2.
3. The protected real write returned HTTP 200 with 6 writes.
4. `GET https://www.cr8w.com/api/dashboard-sync` returned Money count 2, freshness source `notion`, and a new `mirrorUpdatedAt`.
5. Keep the two sample records until UI testing is complete. Delete only those two pages afterward if requested.
6. The next iteration should add the typed property envelope and discover the next approved Notion data sources before enabling more registry entries.

## Efficiency thresholds

The last production read sample was approximately 0.92 seconds and 54.9 KB with one Supabase query. Keep the 30-second visible-tab poll unless three active-use samples show a real request or latency problem. If the payload exceeds roughly 250 KB or the mirror grows beyond roughly 500 records, move search and pagination server-side.

## Shared credit and skill routing

Treat shared Manus project credits as a limited delivery budget. Spend them on verification, not repeated discovery. Read the relevant skill once, reuse its decisions, batch independent read-only checks, and avoid rerunning a build or deployment unless the source commit or deployment configuration changed. Prefer one bounded production check over repeated polling.

Use these skills when the task matches:

| Work | Skill |
| --- | --- |
| Notion source-of-truth workers | `notion-integration-workers` |
| Incremental mirror and checkpoints | `database-sync-workers` |
| Polling, webhooks, or live delivery | `live-sync-architecture` |
| Background or scheduled execution | `automation-and-scheduling` |
| API boundary design | `api-designer` |
| UI performance and load behavior | `performance-optimization` |
| Browser UI verification | `chrome-devtools` or `puppeteer-skill` |
| Production deployment and checks | `ci-cd-and-automation`, `git-workflow-and-versioning` |
| Secure context transfer | `secure-project-handoff` |
| Debugging unexpected failures | `debugging-and-error-recovery` |

Do not invoke unrelated skills only to increase coverage. For a normal dashboard change, the minimum route is: inspect the relevant skill, inspect the affected files, make one scoped change, run one build and one focused check, deploy once from a clean committed checkout, verify one live endpoint, then update the handoff.

## Delivery stages

Development stages are: inspect, implement, validate, deploy, verify, document. Keep Notion writes separate from code deployment. Use dry-run before any real mirror write. Keep production secrets in Vercel only. Deploy from `git archive HEAD` or an equivalent clean checkout when unrelated local changes exist. Never deploy the user’s unrelated working-tree changes by accident.

For a source addition, finish these checks in order: schema access, property-type map, dry-run counts, sensitivity review, real mirror write, dashboard endpoint verification, UI filter verification, and handoff update. Stop if any earlier check fails.

## Credit-saving rules

Do not use subagents for a single-file inspection, do not search the web when repository state is sufficient, do not call a browser repeatedly when one endpoint and one visual check answer the question, and do not regenerate assets that already exist. If a browser artifact fails, report the limitation instead of spending repeated calls trying to force a screenshot.

## Verification commands

Use these commands from the local project directory. Never print secret values.

```bash
cd /Users/monicablanco/Documents/GitHub/CR8WDashVfin
export VERCEL_SKIP_UPDATE_CHECK=1
vercel --prod --yes
curl --fail-with-body --silent --show-error \\
  -X POST 'https://www.cr8w.com/api/notion-sync' \\
  -H "Authorization: Bearer $NOTION_SYNC_OPERATOR_TOKEN" \\
  -H 'Content-Type: application/json' \\
  --data '{"dryRun":true}'
curl --fail-with-body --silent --show-error \\
  'https://www.cr8w.com/api/dashboard-sync'
```

Use a temporary secret file or environment variable. Remove it after the request. Do not add it to Git, chat, screenshots, or handoff files.

## Output style

Lead with the decision. State what passed, what is blocked, and the smallest next action. Do not blur Create Well with Take Home Studio. Do not modify unrelated working-tree files. Prefer one recommended path over a menu.
