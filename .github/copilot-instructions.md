# Copilot Instructions — CR8W Dash (cr8w.com)

Internal Create Well team dashboard. Vite + React 18 + TypeScript frontend,
Vercel serverless API, Supabase storage, Notion as the operational source of truth.

## Core ownership rule (read first)

**Notion writes. Supabase remembers. cr8w.com reads.** The dashboard must never
become a second operational write surface. Never mutate Notion data or schema
without explicit approval, and never add a new database or a second source of
truth. Edits to Notion-mirrored records happen in Notion; the sync copies them
into a Supabase KV mirror (`kv_store_8dcd9693`). The catch-all API does still
write non-Notion data (forum replies, settings, calendar events, invite counts,
and other KV resources) — this rule scopes to Notion-owned records.

Other standing rules (from `.handoff/CONTEXT.md`): work on a feature branch,
preserve existing user changes, keep changes small and independently verifiable,
and never expose credentials or read environment values into handoff artifacts.

## Build, test, and lint

Package manager is **pnpm** (pinned via `packageManager: pnpm@11.24.0`; CI runs
`pnpm install --frozen-lockfile`). npm scripts work but pnpm is canonical.

| Task | Command |
|---|---|
| Dev server | `pnpm dev` (Vite) |
| Build | `pnpm build` (Vite → `dist/`) |
| Typecheck | `pnpm typecheck` — note: `tsconfig.json` only includes `api/`, `tools/`, `tests/`, **not** `src/` |
| Vitest (jsdom, `src/**` + `api/**`) | `pnpm test` |
| Single Vitest file | `npx vitest run path/to/file.test.ts` |
| Node test runner (.mjs) | `pnpm test:node` → `node --test tests/*.test.mjs` |
| Node test runner (.ts) | `pnpm test:ts` → `node --experimental-strip-types --test tests/*.test.ts` |
| Single node test | `node --test tests/<file>.test.mjs` or `node --experimental-strip-types --test tests/<file>.test.ts` |
| E2E (Playwright, chromium) | `pnpm test:e2e` (auto-starts Vite on port 4173) |
| Most of the CI gate | `pnpm check` = node tests + TS tests + typecheck + build (does **not** run Vitest) |
| Full CI gate | `pnpm test && pnpm check` (CI runs Vitest in addition to `check`) |

There are three separate test systems — Vitest (component/unit, jsdom), Node's
built-in runner (`.mjs` and stripped-type `.ts` contract/gate tests in
`tests/`), and Playwright (`e2e/`). Match new tests to the system the
neighboring tests use. The repo has no ESLint config. `pnpm check` omits
Vitest, so the full CI-equivalent gate is `pnpm test && pnpm check`.
Vite is pinned to 6.4.3 via `pnpm.overrides` — do not bump it casually.

## High-level architecture

### Sync pipeline (Notion → Supabase → UI)

- `api/notion-sources.ts` is the **source registry**: each Notion data source
  declares `dataSourceId`, `label`, `enabled`, `visible`, `searchable`,
  `displayFields`, and `sensitivity` (`team` vs `restricted`). Restricted
  sources (e.g. Engineering Delivery) are capability-gated **fail-closed** on
  the server — never loosen this without an explicit, separately validated
  grant. To disable a source, set `enabled: false` in the registry.
- `api/notion-sync.ts` / `api/cron/notion-sync.ts` read Notion and write the
  mirror. Vercel cron hits `/api/cron/notion-sync` every 15 min (see
  `vercel.json`); it fails closed (401) when `CRON_SECRET` is unset.
- Writes go through a single Postgres transaction via
  `public.cr8w_publish_notion_snapshot`, gated by `CR8W_ATOMIC_RPC_ENABLED=true`.
- `api/notion-property-envelope.ts` + `src/shared/notion-contract.ts` implement
  the **typed property envelope** normalization shared between server and UI.

### API surface

- `api/server/[[...path]].ts` is a Vercel catch-all: `req.query.path` holds the
  route segments (`/api/server/sync` → `['sync']`). Auth is Bearer-token based:
  the Supabase publishable key (hash-login sessions) or a verified Supabase user
  JWT; requests fail closed when a publishable key is configured. Exception:
  the `health` route is intentionally public.
- `api/notion-webhook.ts` receives Notion webhooks (verification token stashed
  in KV for operator retrieval).

### Frontend

- `src/app/routes.tsx` lazy-loads pages from `src/app/pages/` (ThisWeek, Moves,
  Flows, Money, Care, Decisions, System). Feature code lives in
  `src/features/` (coflow, content, forum, geyser, hub, messages, stations,
  tasks, workshops).
- Route data flows through `src/app/components/api.ts` →
  `src/contexts/SyncProvider.tsx` → `src/contexts/DashboardContext.tsx`.
  `api.ts` resolves the API base at **runtime by hostname** (Vercel/custom
  domains → same-origin `/api/server`; Figma Make preview → absolute URL;
  `VITE_API_BASE` overrides).
- The mirror UI (`NotionMirrorSummary.tsx`) derives its source list and labels
  from the server-sent `notionSources` registry metadata, with the static label
  table as fallback — extend the registry, don't hardcode sources in the UI.
- Path alias `@` → `src/`. A custom Vite plugin resolves `figma:asset/…`
  imports to `src/assets/` (Figma Make heritage — keep it). Only `.svg`/`.csv`
  may be added to `assetsInclude`; never `.css`/`.ts`/`.tsx`. The React and
  Tailwind Vite plugins are required even where Tailwind isn't actively used.
- Pages render Money amounts via `moneyAmountDisplay(record)` (typed envelope
  or plain number, null-safe, no currency symbol until the schema provides one).

## Handoff artifacts

`.handoff/` (CONTEXT.md, STATE.md, NEXT_ACTION.md, VALIDATION.md) is the
session-to-session state of record — read it before non-trivial work and update
it after. It must never contain credentials or environment values. `docs/` holds
durable design docs (typed envelope plan, sync operations runbook, migration
scope).

## Operator sync runbook (abbreviated from docs/NOTION_SYNC_OPERATIONS.md)

Mandatory sequence for any mirror write:

1. `node scripts/run-notion-sync.mjs` — dry-run first (add `--sources people`
   to target one source). Inspect per-source counts and `validationErrors: 0`.
2. Re-run with `--write` only after the dry-run is clean.
3. Verify: `curl https://www.cr8w.com/api/dashboard-sync` (counts + fresh
   `mirrorUpdatedAt`) and a dashboard UI check.

The runner exits non-zero on any source failure or contract validation error.
Operator scripts load `.env.local` (gitignored, never committed). Never rotate
or expose the operator token unless access is intentionally transferred.
