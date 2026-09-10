# Notion Mirror Code Review

## Scope

This review covers the protected Notion-to-Supabase sync worker, the read-only dashboard endpoint, the typed frontend mirror contract, the filter/search view, and the CR8W Engineering Delivery source rollout.

## Summary

The mirror architecture has a sound source-of-truth boundary: Notion writes, the protected server worker normalizes and caches, and the browser reads the dashboard endpoint. The typed-property envelope is a good compatibility boundary because it preserves the Notion type while keeping the normalized value available to the UI.

The highest-value improvements are to replace `any` at the server boundary with narrow Notion response types, avoid repeated JSON serialization during client-side search, stabilize the mirror collection memoization, and make source keys a shared type rather than duplicated string unions. The current Engineering Delivery source is appropriate as a restricted read-only pipeline lane. The reviewed operating guide identifies it as the single planning and handoff register and explicitly says not to duplicate operational or engineering facts into additional databases, so no second pipeline data source should be invented or enabled without a new approved Notion schema.

## Findings

| Priority | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| High | Server type safety | `notion-sync.ts` uses `any` for Notion properties, pages, query responses, and normalization. | Add narrow interfaces for page envelopes, property maps, pagination responses, and known property payloads. Keep an `UnknownNotionProperty` fallback for forward compatibility. |
| High | Server privacy | Typed envelopes include normalized values and a sensitivity label, but the dashboard endpoint returns all enabled sources to every authenticated dashboard reader. | Enforce source-level authorization before exposing restricted records, or keep the current private-dashboard assumption explicit in the server contract. Do not rely on a frontend filter for privacy. |
| Medium | Sync resilience | All enabled sources are queried with `Promise.all`; one source failure fails the complete sync. | Decide whether source isolation is preferred. A resilient mode could return per-source errors and preserve the last-good snapshot for unaffected sources. |
| Medium | Sync write efficiency | `writeMirror()` creates a new Supabase client for every source write. | Create one request-scoped Supabase client and pass it to the write helper. This reduces client construction and makes the write transaction boundary clearer. |
| Medium | Display values | `displayValue: String(normalized)` produces poor values for date objects and nested rollups, such as `[object Object]`. | Add a server-side display formatter or omit `displayValue` when the normalized value is structured. Let the typed frontend formatter render dates and arrays. |
| Medium | Frontend performance | `collections` is recreated on every render, so both `useMemo` calls are invalidated on every keystroke. | Memoize collections from the six mirror arrays, or derive a stable flattened record list with `useMemo`. |
| Medium | Frontend search | `recordSearchText()` calls `JSON.stringify(record.properties)` during every filter evaluation. | Build a lowercased search index when mirror data changes; evaluate search against the cached text. This matters as records approach the handoff threshold of roughly 500 records. |
| Low | Frontend type safety | `NotionMirrorRecord.source` duplicates the source-key union instead of deriving from the registry. | Export a shared source-key type from a shared contract module, or generate the frontend union from the backend contract. |
| Low | Endpoint parsing | `dashboard-sync.ts` uses `any[]` and `Record<string, any>` for decoded KV values. | Use `unknown[]` and validate the expected record envelope before returning it. Invalid mirror values should be ignored or marked stale, not silently treated as valid records. |
| Low | Freshness semantics | A single freshness object describes all sources even when a future source fails independently. | Add optional per-source freshness and last-success metadata if source isolation is introduced. |

## Engineering Delivery source decision

The Engineering Delivery operating guide describes one planning and handoff register, not a family of operational databases. It explicitly assigns implementation history to GitHub, API behavior to versioned contracts, UI behavior to source/design artifacts, and business records to the existing operational databases. Therefore:

- `engineeringDelivery` is the next approved pipeline source and is enabled as a restricted typed mirror.
- Tool Access Registry is governance-only and should not be added to the delivery pipeline.
- Operational People, Flows, Moves, Content, and Money sources should not be duplicated into Engineering Delivery.
- Additional pipeline sources require a new Notion schema and an explicit source-boundary decision.

## Suggested implementation order

First, introduce shared source and record contracts and narrow the server normalization boundary. Next, stabilize frontend collections and add a cached search index. Then add per-source error/freshness metadata if the team wants partial sync success. Finally, add source-level authorization before exposing any restricted GitHub or contract links outside the private team dashboard.

## Current validation

The typed mirror unit suite passes. The Vite production build passes with manual vendor chunking. The main application chunk is below the warning threshold after vendor separation. Playwright smoke coverage is now configured for the authenticated dashboard shell, mocked dashboard sync, typed Engineering Delivery filtering, and unauthenticated sign-in rendering.
