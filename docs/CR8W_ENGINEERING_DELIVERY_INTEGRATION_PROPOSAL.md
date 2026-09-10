# CR8W Engineering Delivery Integration Proposal

## Decision

Enable `CR8W Engineering Delivery` as a **restricted, read-only engineering lane** in the private team dashboard. It remains separate from the five operational sources and does not write back to Notion or infer operational completion.

## Reviewed schema

The reviewed Notion data source is `collection://eb498877-a74f-4abe-bac3-8d1dfbc62db8`, titled **CR8W Engineering Delivery**. It contains the following properties:

| Property | Notion type | Dashboard meaning |
| --- | --- | --- |
| Name | title | Delivery item name |
| Stage | select | Ready, Building, Review, Blocked, Verified, or Dropped |
| Surface | multi-select | UI, API, Data/Sync, or Platform |
| Target | date | Delivery target date or range |
| Owner | person | Responsible contributor |
| Blocked By | text | Human-readable dependency or blocker |
| GitHub PR | URL | Pull request evidence |
| API Contract | URL | API specification or contract evidence |
| UI Spec | URL | UI/design evidence |
| Acceptance Evidence | URL | Verification evidence |
| Last Updated | last edited time | Notion freshness signal |

The source contains no money fields, participant data, consent fields, or operational status fields. Its primary sensitivity is internal engineering coordination and links to potentially private repositories or contracts.

## Recommended dashboard experience

Expose the source in the existing Notion mirror view under a dedicated **Engineering Delivery** source filter. The view shows freshness, source counts, and a compact delivery queue. It supports typed-property search and filters for `Stage`, `Surface`, target dates, and blockers as the source data becomes available.

Each card should show the delivery name, stage, surface badges, target date, owner, and a blocker indicator. Evidence links should remain explicit and should open in a new tab. The panel should not expose raw property envelopes to users; it should use the same typed display normalizer used by the operational mirror.

## Boundary and security

Notion remains the write surface. The dashboard receives only the server-side mirror response. The source is marked `restricted` sensitivity because GitHub PRs, API contracts, UI specifications, and acceptance evidence may contain private links. No service credentials, repository tokens, or write actions should be exposed to the browser.

The source should not be used to infer operational completion. A `Verified` engineering delivery item means the engineering acceptance evidence is present; it does not automatically change a Flow, Move, Content, or Money record.

## Proposed implementation

1. Approval resolved: the source is for private dashboard users only, with restricted sensitivity and no public exposure.
2. Approval resolved: GitHub, contract, UI-spec, and acceptance links are restricted to the same private audience.
3. Approval resolved: status is manually mirrored from Notion; GitHub/Vercel linkage is deferred.
4. Add the enabled registry entry with the reviewed data-source ID and `typedProperties: true`.
5. Extend the dashboard payload with an optional `engineeringDelivery` collection and source metadata.
6. Run a protected dry-run and compare record counts, schema types, and link sensitivity before any real mirror write.
7. Write the mirror, verify freshness and counts through `/api/dashboard-sync`, and perform one UI filter/search check.
8. Document the approved boundary and rollback procedure in the project handoff.

## Rollback

Rollback is registry-based: set the source to `enabled: false`, deploy the server, and remove the source from the dashboard payload on the next code change. Do not delete Notion records or mirror keys as part of the first rollback. Preserve the last successful freshness metadata so the dashboard can show that the optional lane is unavailable rather than presenting an empty state as current.

## Approval decision record

| Decision | Resolution |
| --- | --- |
| Dashboard audience | Private team dashboard only |
| Link sensitivity | Restricted; links are not exposed publicly |
| Placement | Existing Notion mirror view with an Engineering Delivery source lane |
| Status authority | Notion manual status; GitHub/Vercel linkage deferred |
| Registry state | Enabled with typed envelopes and read-only mirror behavior |

The source is now approved for the scoped restricted rollout. A protected dry-run and post-write endpoint verification remain required before treating the mirror as production-fresh.
