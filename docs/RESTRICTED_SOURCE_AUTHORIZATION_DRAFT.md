# CR8W Restricted Source Authorization Draft

**Status:** Authorization and schema decision recorded; enforcement is not implemented.

## Recorded Engineering Delivery decision

The approved source family is the existing **CR8W Engineering Delivery** data source (`eb498877-a74f-4abe-bac3-8d1dfbc62db8`, titled `CR8W Engineering Delivery`). Do not switch this worker to the separate System Admin master sources named in the existing blocker note. This decision is limited to source identity and field mapping; it does not grant any dashboard user access.

The source remains **restricted**. Its records may be mirrored server-side only, and may be returned only to a user with a server-managed `engineeringDelivery` grant or role. No user allowlist or role grant was created in this pass. Until server-side enforcement is complete, the source must not be exposed through the dashboard payload.

## Captured schema

| Property | Notion type | Planned envelope value | Exposure note |
|---|---|---|---|
| Name | title | string | Restricted source; expose only to authorized users |
| Stage | select | option string | Preserve the six configured options |
| Surface | multi-select | string array | Preserve configured values such as `UI`, `API`, `Data/Sync`, and `Platform` |
| Target | date | `{ start, end, time_zone }` or null | Treat expanded `date:Target:*` columns as one property |
| Owner | person | stable relation/person IDs | Do not expose names to unauthorized callers |
| Blocked By | text | string | Restricted operational detail |
| GitHub PR | url | URL or null | Restricted link; redact unless authorized |
| Acceptance Evidence | url | URL or null | Restricted link; redact unless authorized |
| API Contract | url | URL or null | Restricted link; redact unless authorized |
| UI Spec | url | URL or null | Restricted link; redact unless authorized |
| Last Updated | last_edited_time | ISO timestamp | Use for freshness/audit, not identity |

The read-only schema capture found one record, `Dashboard source-sync recovery`, with `Stage = Blocked` and `Surface = ["Data/Sync", "Platform"]`. Its blocker text explicitly references the source-family choice; the recorded decision above resolves that choice without authorizing a production write.

## Decision boundary

The Notion source registry classifies `engineeringDelivery` as `restricted`. Its records can contain GitHub pull-request links, acceptance evidence, owners, blockers, targets, and other operational delivery information. These records and links must remain inaccessible to users who are authenticated to the dashboard but are not authorized for restricted Engineering Delivery data.

Authorization must be enforced in the server-side read path. Frontend route guards, `localStorage.cr8w_user_profile`, profile labels, and hidden UI controls are not authorization mechanisms because they can be bypassed or modified by a client.

## Proposed policy

| Data class | Default audience | Server response rule | Failure behavior |
| --- | --- | --- | --- |
| `public` | Unauthenticated or public product surface, only if explicitly approved | May be returned by a deliberately public endpoint | Deny by default until explicitly registered |
| `team` | Authenticated CR8W users | Return only after validating the Supabase access token | Return an empty/omitted source, not an error containing source details |
| `restricted` | Authenticated users on an explicit allowlist or server-managed role | Return only after server-side authorization for that source | Omit records, links, counts, and source-specific errors; record an audit event server-side |

For the current dashboard, the recommended default is **authenticated-only access for all operational mirror data**. `Money` and `Engineering Delivery` require an additional restricted-source grant. No source should be exposed solely because the user selected a profile during registration.

## Engineering Delivery rule

A request may receive `engineeringDelivery` records only when all of the following are true:

1. The request presents a valid, non-expired Supabase access token.
2. The server validates the token with Supabase Auth or an equivalent trusted JWT verification path.
3. The token subject is an active user.
4. The server-side authorization policy grants `notion:engineeringDelivery:read` to that subject, either through a server-managed role in `app_metadata` or an explicit subject allowlist maintained outside the browser.
5. The source is enabled in `api/notion-sources.ts` and remains classified as `restricted`.

The policy must not use `user_metadata.cr8w_profile`, `localStorage.cr8w_user_profile`, display names, email-domain matching, query-string flags, or client-supplied headers as the grant. User metadata and profile labels are presentation attributes, not trusted authorization claims.

## Endpoint contract

The server should derive an authorization context before constructing `notionMirrors` or `notionSources`:

```text
GET /api/dashboard-sync
Authorization: Bearer <Supabase access token>
```

The response should include only sources authorized for the caller. For a caller without Engineering Delivery permission:

- omit `notionMirrors.engineeringDelivery`, or return an empty array under a clearly documented redacted-source contract;
- omit Engineering Delivery from the visible source metadata, or mark it `authorized: false` without record counts;
- never return `sourceUrl`, GitHub PR links, acceptance evidence, owner details, blocker text, or raw property values from that source;
- do not reveal whether restricted records exist through counts, timing differences, error messages, or source-specific freshness details.

The preferred contract is omission plus a generic UI explanation such as “This source requires additional access.” The browser must not receive a permission decision that can be confused with a source record or a Notion error.

## Money and future restricted sources

Apply the same policy to `money`. Keep restricted-source grants keyed by stable Supabase user IDs or server-managed roles, not profile strings. Add new restricted sources only after documenting the source key, data fields, authorized audience, redaction policy, audit event, and test cases.

## Defense in depth

The frontend may hide the Engineering Delivery filter, links, and navigation for unauthorized callers, but it must treat server omission as authoritative. If a restricted source appears in an unauthorized payload, the client should discard it and report a non-sensitive telemetry event. UI checks should use a server-provided capability such as `permissions.sources.engineeringDelivery.read`, never a locally selected profile.

The API should also:

- replace `Access-Control-Allow-Origin: *` with the approved dashboard origins where browser credentials are used;
- send `Cache-Control: private, no-store` for authenticated dashboard responses;
- avoid logging record payloads, URLs, email addresses, tokens, or raw authorization claims;
- rate-limit unauthorized requests without exposing whether a restricted source exists;
- audit successful restricted reads with subject ID, source key, timestamp, request ID, and outcome, excluding record contents;
- default to deny when claims, policy configuration, or the authorization service is unavailable.

## Required tests before exposure

1. Unauthenticated dashboard-sync request receives `401` and no mirror data.
2. Authenticated team user receives team sources but no Money or Engineering Delivery records.
3. Authorized Engineering Delivery user receives only the approved source and fields.
4. A user with a forged profile label or altered local storage still receives no restricted data.
5. Missing, expired, malformed, or revoked tokens fail closed.
6. A policy lookup timeout fails closed and does not reveal source existence.
7. Restricted records and links are absent from serialized HTML, browser storage, logs, error messages, and cacheable responses for unauthorized users.
8. Source-level freshness metadata is omitted or redacted for unauthorized restricted sources.
9. The policy is tested for both the normal dashboard endpoint and any alternate or legacy API route.

## Local dry-run token provisioning

Do not send `NOTION_SYNC_OPERATOR_TOKEN` through chat, commit it, put it in a frontend file, or paste it into a screenshot. The operator token is a server-to-server credential for the protected Notion sync endpoint and should be provisioned through a local secret manager or a terminal-only environment file with restrictive permissions.

A safe local-only workflow is:

```bash
cd /Users/monicablanco/Documents/GitHub/CR8WDashVfin
umask 077
touch .env.local
chmod 600 .env.local
printf 'NOTION_SYNC_OPERATOR_TOKEN=' >> .env.local
# Paste the token only into this terminal prompt, then press Enter.
# Do not include the token in shell history, editor history, or chat.
```

The value must match the operator token configured for the deployed Vercel function. Do not generate a different local value and expect it to work. If an authorized operator is rotating or creating the shared server-side token, use a cryptographically secure generator and update the approved Vercel secret and local secret store as one coordinated rotation rather than inventing a password:

```bash
openssl rand -base64 32
```

After provisioning, run the dry-run without printing the request body or token:

```bash
set -a
. .env.local
set +a
test -n "$NOTION_SYNC_OPERATOR_TOKEN"
curl --fail-with-body --silent --show-error \
  -X POST 'https://www.cr8w.com/api/notion-sync' \
  -H "Authorization: Bearer $NOTION_SYNC_OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"dryRun":true}' \
  -o /tmp/cr8w-notion-dry-run.json \
  -w 'status=%{http_code} bytes=%{size_download}\n'

# Inspect only aggregate counts and failure presence.
jq '{ok, dryRun, recordsSeen, counts, failedSources: ([.failedSources[]? | {source, error_present: (.error != null)}]), writes}' \
  /tmp/cr8w-notion-dry-run.json

rm -f /tmp/cr8w-notion-dry-run.json
unset NOTION_SYNC_OPERATOR_TOKEN
```

Verify `.env.local` is ignored by Git before use. If a token is ever exposed in a commit, log, terminal recording, screenshot, or chat, revoke and rotate it immediately. A dry-run must complete and its per-source counts must be reviewed before any non-dry-run mirror write.

## Current code-review findings

The requested unstaged migration changes are not included in this draft’s implementation. `App.tsx` adds `SyncProvider` around `DashboardProvider`, which is directionally appropriate for separating polling lifecycle from dashboard projection. `CarePage.tsx` adds `CoFlowUpcomingFeature` while preserving the existing consent-based `ViewShell` state gate; that component should be checked to ensure it does not independently fetch or expose consent-restricted data.

`DashboardContext.tsx` now projects data from `SyncProvider`, but its exposed action currently contains `retrySync() { retrySync(); }`. Because the method name shadows the callback destructured from `useSync()`, this is recursive and will overflow when the UI invokes retry. Rename the destructured callback, for example `retrySync: requestSync`, and delegate with `retrySync() { requestSync(); }`. This should be fixed and covered before treating the migration as production-ready.

These working-tree changes remain intentionally unstaged and unmodified.

## Smallest implementation sequence

1. Add server-side Supabase token validation and a policy function that returns source capabilities.
2. Change `dashboard-sync` to build its source keys and response from authorized capabilities, defaulting to deny.
3. Add restricted-source redaction and private no-store headers.
4. Add unit and Playwright coverage for authorized, unauthorized, expired-token, and policy-failure cases.
5. Fix and test the `DashboardContext` retry delegation separately from authorization.
6. Deploy only after a dry-run, live read verification, and security-focused tests pass.

No real mirror write or restricted-source exposure is authorized by this draft.

## Status

**NOT NOW:** This document is a design draft only. It does not change source authorization, dashboard behavior, or Notion/Supabase data.


## Authorization and schema evidence checkpoint — 2026-09-10

The linked [Create Well OS — Master System](https://app.notion.com/p/7b4774c7e9ad4333841dd757a4b1c1df) was reviewed as the canonical system map. It confirms the strategic spine and the five operational databases—FLOWS, MOVES, MONEY, CONTENT, and PEOPLE—but does not change the separate Engineering Delivery authorization decision.

The approved Engineering Delivery data source was fetched read-only from `collection://eb498877-a74f-4abe-bac3-8d1dfbc62db8`. Its exact schema is captured above in this document. A bounded aggregate query returned one non-archived record in `Blocked` stage. No record payload, relation name, owner identity, blocker text, or URL was written to logs or client-facing artifacts. No Notion or mirror write was performed.

This remains a design and schema-capture checkpoint. The source is **not authorized for dashboard exposure** until a server-managed grant or role is implemented and tested with fail-closed behavior. The smallest next implementation is server-side Supabase token validation, capability derivation for `notion:engineeringDelivery:read`, source-level omission for unauthorized callers, private no-store caching headers, and authorization tests covering normal and legacy API routes.
