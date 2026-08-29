---
name: notion-supabase-sync-worker
description: Build and operate secure server-only Notion-to-Supabase synchronization workers with versioned mappings, dry-run contracts, connector-backed CLI database proposals, retries, checkpoints, and resumable handoffs. Use when syncing Notion databases, creating a Notion integration worker, mapping Notion data sources to Supabase, bootstrapping operational databases, or troubleshooting authenticated Notion syncs.
---

# Notion-to-Supabase Sync Worker

Treat Notion as the operational source of truth and Supabase as the operational mirror or structured execution store. Build a server-only integration boundary; never pass Notion credentials, raw Notion page objects, or connector sessions into a client bundle.

## Workflow

1. **Inspect before editing.** Read repository instructions, the current server boundary, lockfile, deployment configuration, existing Supabase schema, handoff state, and branch. Discover exact Notion CLI/MCP tools and input schemas before calling them. Never guess IDs, property names, or pagination fields.
2. **Verify access read-only.** Fetch each canonical Notion database/data-source schema. Identify stable page identity, title field, editable fields, relations, rollups, formulas, archive behavior, and queryability. Record metadata and aggregate evidence; do not print tokens or unnecessary row content.
3. **Write the contract first.** Create a versioned mapping module and written synchronization contract. Centralize all data-source IDs and Notion property names. Define normalized records, identity, cursor semantics, idempotency, archive/deletion policy, conflict policy, retries, dead letters, observability, and write gates.
4. **Separate business data from control-plane data.** Preserve existing business data sources as the sole source of truth. If operational databases are useful, draft a proposal for checkpoints, dead letters, and run audit records. Do not create or alter Notion schemas until the proposal is explicitly approved.
5. **Implement the server-only adapter.** Use the official Notion data-source query API or approved connector-backed execution path. Require a server-only `NOTION_API_KEY` or approved runtime credential. Use bounded pagination, `filter_properties` where supported, retryable-status backoff, secret-safe errors, and normalized typed domain models.
6. **Implement the worker dry-run first.** Default to `--dry-run`; support `--source` and bounded `--limit`. Emit machine-readable run ID, contract version, per-source counts, planned operations, cursor movement, and dead-letter counts. Do not write Notion or Supabase in dry-run mode. Refuse write mode until migration, conflict, and authorization gates are approved.
7. **Use CLI bootstrap only behind approval.** A database bootstrap helper may call `manus-mcp-cli tool call notion-create-database`, but plan mode must be the default. Apply mode must require both an explicit parent page ID and a separate approval flag such as `NOTION_SCHEMA_CHANGE_APPROVED=true`. Never duplicate or replace business databases.
8. **Validate progressively.** Run syntax checks, focused mapping/normalization tests, the full test suite, lint/typecheck/build where available, dry-run credential-gate tests, secret scans, and `git diff --check`. Install from the committed lockfile; do not run automatic dependency remediation during a feature change.
9. **Checkpoint and report.** Refresh a redacted handoff containing state, next action, validation, required environment variables, permissions, and rollback/resume instructions. Use a feature branch and logical conventional commits. Do not commit secrets, generated dependencies, build output, or raw Notion records.

## Mapping and normalized record contract

Use one versioned mapping module:

```ts
{
  contractVersion: '1.0.0',
  source: 'tasks',
  dataSourceId: '…',
  identity: 'page_id',
  properties: [{ notionName: 'Tasks', kind: 'title', destination: 'title', writable: false }]
}
```

Normalize before downstream processing:

```json
{
  "source": "tasks",
  "source_page_id": "…",
  "source_url": "…",
  "source_last_edited_at": "…",
  "archived": false,
  "title": "…",
  "fields": {},
  "relations": {},
  "idempotency_key": "notion:tasks:<page_id>:<revision>"
}
```

Use stable Notion page IDs for identity. Timestamps are change hints, not identities. Preserve unknown properties where feasible. Represent archived pages explicitly; never silently delete records.

## Runtime and security gates

Require these only in server runtime scopes: `NOTION_API_KEY` or the approved connector-backed credential, optional `NOTION_API_VERSION`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` for server-side writes. Never use `VITE_`, `PUBLIC_`, or `NEXT_PUBLIC_` prefixes for secrets. Never log authorization headers, tokens, full request bodies, or raw page contents. Notion MCP/OAuth access does not automatically transfer into Vercel, WebDev, a local CLI, or a persistent worker runtime; verify portability explicitly.

## Sync policies

The first release should be pull-only and dry-run. Fetch each source using a durable cursor when available, normalize, validate, resolve conflicts, upsert transactionally, and persist the cursor only after durable writes. Retry 408, 429, and 5xx with bounded exponential backoff and jitter. Do not retry 401, 403, 404, schema mismatches, or malformed records. Route malformed records and unresolved conflicts to dead-letter/manual review.

Required control-plane stores are:

| Store | Purpose |
|---|---|
| Sync records | Idempotent normalized mirror keyed by source and page ID |
| Sync checkpoints | Cursor and last completed run per source/destination |
| Dead letters | Malformed/conflicting records for manual review |
| Sync runs | Run status, counts, timing, and error class |

Do not assume rollups, formulas, relations, buttons, or files are writable or round-trip losslessly. Treat archive and trash as separate states. Require an explicit policy before write-back to Notion or destructive deletion anywhere.

## CLI database proposal pattern

First write a proposal containing purpose, parent page, exact DDL, permissions, ownership, migration/rollback plan, and proof that business source-of-truth databases will not be duplicated. Then implement a plan-first helper:

```sh
node scripts/notion-database-bootstrap.mjs --plan
# Only after explicit approval:
NOTION_SCHEMA_CHANGE_APPROVED=true node scripts/notion-database-bootstrap.mjs --apply --parent-page-id=<approved-page>
```

Use the exact tool schema discovered at runtime. After creation, fetch each returned data-source ID and record it in versioned configuration. Never treat plan output as proof that a mutation occurred.

## Validation checklist

- Confirm the connection and each data-source schema read-only.
- Confirm every mapping ID and property name against a fresh schema fetch.
- Test title, text, select/status, date, relation, file, checkbox, archive, and unknown-property normalization as applicable.
- Test bounded pagination, retry classification, cursor non-advancement on failure, idempotency, and dead-letter behavior.
- Test missing credentials fail closed before network activity.
- Run repository tests and build; document unavailable tools or dependencies instead of bypassing them.
- Inspect the diff for secrets, raw records, generated files, and unrelated changes.
- Refresh the redacted handoff before switching accounts, models, branches, or deployment environments.

## Reporting format

Report one confirmed root cause, then:

- `## Root Cause`
- `## Changes Made (file by file)`
- `## Validation (typecheck / lint / build / read / write / states)`
- `## Remaining Risks`
- `## Next Step (single highest-leverage item)`

Attach the skill-owned contract, proposal, validation, and checkpoint artifacts when they are deliverables. Keep the summary concise and never include secret values.
