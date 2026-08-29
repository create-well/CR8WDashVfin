# Create Well Dashboard Secure Continuation Handoff

## Confirmed state

The production dashboard is [cr8w-dash-vfin.vercel.app][1]. Repository: `create-well/CR8WDashVfin`. The latest referenced production verification reports PR #12 merged to `main`, Vercel deployment `3f207e7` ready, 19 of 19 production smoke routes passing, authenticated sync returning 200, and the protected Notion sync-runs route returning 200.

## Root Cause

Production authentication failed because the client API layer and calendar-sync request embedded a stale hardcoded Supabase publishable token. Production had rotated to the `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` contract, so the browser sent a credential that did not match the configured contract.

This supersedes earlier route and parser hypotheses for the current production state. Reopen those hypotheses only if new runtime evidence contradicts the verified deployment results.

## Source-of-truth boundary

**Notion is the operational human write surface and source of truth. Supabase is the structured runtime persistence and cache boundary. Manus API is an orchestration layer, not a replacement database.** Manus API may create tasks, continue agent conversations, use connectors, and deliver structured results, but it does not eliminate the dashboard’s Notion-to-Supabase data path.

All Notion calls remain server-side. Raw Notion page objects must be normalized into typed domain models before reaching React. Database IDs and property mappings belong in one configuration module. No Notion schema mutation, data deletion, or source-of-truth swap is authorized.

Canonical Notion data sources:

| Domain | Data source |
|---|---|
| PEOPLE | `collection://b97bcbdf-2b1b-488d-9d07-4012b031732e` |
| FLOWS | `collection://c1677843-dd13-4e37-9f80-e960b26847dc` |
| MOVES | `collection://5597e583-f7df-4f6c-90b0-296a26c57454` |
| MONEY | `collection://55832c19-38fa-44cb-b4c2-0174b4c5b207` |
| CONTENT | `collection://cd410d33-8052-4897-8226-3a3ca84ea8bc` |

## Completed corrections

| File | Verified change |
|---|---|
| `src/app/components/api.ts` | Uses `VITE_SUPABASE_PUBLISHABLE_KEY` with the existing public fallback for non-production environments and exports the shared `API_KEY`. No hardcoded `sb_publishable_...` literal remains. |
| `src/app/components/HubView.tsx` | Reuses the shared `API_KEY` for calendar-sync requests. |
| `tests/dashboard-contract.test.mjs` | Rejects hardcoded publishable tokens in both client request paths and enforces the injected-key contract. |
| `api/server.ts` | Remains the canonical Vercel entry point for `/api/server?path=...`, with server-only credentials and fail-closed auth. |
| `src/contexts/DashboardContext.tsx` and `src/app/components/ViewShell.tsx` | Preserve last-known-good content and show retry/stale states instead of a blank failure shell. |

PR #12 was merged into `main`. Production deployment `3f207e7` is reported READY.

## Secure handoff policy

Only secret names, ownership, scope, and environment belong in this handoff. Values must remain in Vercel, GitHub, Supabase, Notion, or the receiving provider’s own secret store.

| Secret name | Used by | Required scope | Handoff rule |
|---|---|---|---|
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser build | Publishable client access | Name only; never paste value into prompts or files |
| `SUPABASE_PUBLISHABLE_KEY` | Vercel/server contract | Publishable client/auth contract | Name only |
| `SUPABASE_URL` | Server runtime | Supabase project endpoint | Name only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server runtime | Server-only Supabase access | Never expose to client or handoff |
| Notion integration credential | Server-side sync | Access to shared canonical data sources | Receiving runtime authenticates independently |

## Resumable implementation plan

1. Start from the current merged `main` branch and verify the recorded deployment and commit before editing.
2. Re-run the production smoke suite and verify health, authenticated sync, protected Notion sync-runs, unauthorized rejection, and populated or explicit empty states.
3. Run a fresh Lighthouse audit against the populated `/system` page. Compare against the earlier failure-state baseline: Performance 78, Accessibility 92, Best Practices 96, SEO 58, CLS 0.1689, and LCP 3.67 seconds.
4. If live sync regresses, localize in order: client key injection, Vercel server auth, Supabase connectivity, Notion fetch/normalization, then UI state rendering. Do not change schema before proving the failing boundary.
5. For recurring sync, prefer signed webhooks when supported. Otherwise use bounded polling with a durable cursor, jitter, retries, idempotency keys, checkpoint-after-write semantics, dead-letter/manual-review handling, and periodic reconciliation. Do not use in-process timers for production recurrence.
6. Use a workflow runtime only when the sync needs durable multi-step execution or long waits. Keep external I/O and Node.js-dependent work in retryable steps. Use Durable Objects only for per-entity coordination, WebSockets, alarms, or strong single-entity consistency. Do not introduce either abstraction for the current stateless request path without measured need.
7. Keep API changes backward-compatible. If a new contract is needed, document authentication, error shapes, pagination, rate limits, and a version/deprecation path before implementation.

## Provider-neutral continuation prompts

### Notion AI

> Resume from `docs/CONTINUATION_HANDOFF.md` and `.handoff/`. Production auth is fixed and verified after PR #12; deployment `3f207e7` is READY and the 19-route smoke suite passed. Do not repeat the earlier route/parser investigation. Verify the current main deployment and run the Lighthouse follow-up. Keep Notion as source of truth and Supabase as runtime/cache boundary. Never request or expose secret values.

### Perplexity Max

> Treat `docs/CONTINUATION_HANDOFF.md` as the redacted source of truth. Cross-check only current `main`, PR #12, deployment `3f207e7`, and the production dashboard. Produce an evidence table for smoke results, Lighthouse metrics, auth boundary, and remaining risks. Do not change Notion data, schema, credentials, or API contracts.

### Gemini Pro

> Continue from the secure handoff. The stale hardcoded client Supabase publishable token was removed and production is verified. Run the bounded Lighthouse and smoke checks first. Make only evidence-backed changes, preserve stale-but-labeled data during sync failures, and keep secrets in the receiving platform’s secret manager.

## Recovery runbook

If a check fails, capture timestamp, deployment ID, route, status, redacted error class, request ID if present, and the failing boundary. Retry only transient 429/5xx/network failures with bounded exponential backoff and jitter. Treat 4xx auth/configuration failures as non-retryable until configuration is verified. Never advance a sync checkpoint before durable writes succeed. Never log page content, tokens, cookies, or full request bodies.

## Fresh Lighthouse result

A fresh Lighthouse run completed against `https://cr8w-dash-vfin.vercel.app/system` at `2026-08-29T13:59:12.018Z` with no runtime error. Results: Performance 79, Accessibility 92, Best Practices 96, SEO 58, LCP 3.6386 seconds, CLS 0.16885, FCP 2.6177 seconds, and TTI 3.6386 seconds. Compared with the prior failure-state baseline of LCP 3.67 seconds and CLS 0.1689, this is effectively unchanged. The current baseline is recorded in `.handoff/LIGHTHOUSE_2026-08-29.md` and `.handoff/VALIDATION.md`.

The provider routing and secure integration envelope are recorded in `.handoff/PROVIDERS.md`. Notion AI handles operational synthesis, Perplexity Max handles public evidence cross-checks, and Gemini Pro handles implementation/test/performance analysis. All receive redacted context only and require explicit approval for production writes, credential changes, merges, deploy promotions, or Notion mutations.

## Next single highest-leverage action

Trace the populated Production `/system` page to identify the LCP element and layout-shift contributors before making any UI or performance code changes.

## References

[1]: https://cr8w-dash-vfin.vercel.app/ "Create Well dashboard"
[2]: https://github.com/create-well/CR8WDashVfin "CR8WDashVfin repository"
[3]: https://github.com/create-well/CR8WDashVfin/pull/12 "PR #12 production authentication fix"
[4]: https://vercel.com/monnylog/cr8w-dash-vfin "Vercel project"
[5]: https://api.manus.ai "Manus API"

**Last updated:** 2026-08-29
**Source:** referenced task “Is Supabase Needed for Manus-API?” and its verified production report.
