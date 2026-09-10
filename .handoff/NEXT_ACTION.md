# Next Action

Deployment is complete: commit `e3baa57` is Ready as `dpl_EW8yQz1QqjD58XzpEmfdHrEoi385` and aliased to `https://www.cr8w.com`. The remaining action is authenticated browser verification across Overview, Journey, Stations, Moves, and Forum tabs when the My Browser artifact layer is available.

The latest production deployment is `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU`; the live homepage returned HTTP 200 and `/api/dashboard-sync` returned HTTP 200 with Notion freshness metadata and 6 tasks / 6 stations.

Current status: clean production deployment, HTTP route/API checks, deployed-asset checks, post-deployment monitoring, and authenticated visual verification are complete. Overview, Stations, and Moves rendered successfully on `/moves`; no mutations were submitted.

After UI testing, delete only the two labeled sample pages if they are no longer needed. Keep the source registry and typed property normalization.

Next development cycle: obtain the existing Notion sync operator token through an approved secure local channel and rerun the protected dry-run; the current attempt returned 401 because Vercel will not download Hidden Secret values. The linked Master System was read through the Notion connector and its strategic spine plus five operational schemas were captured in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; this did not update the dashboard mirror. The typed envelope definitions and tests are drafted. Engineering Delivery source identity and schema are resolved, but server-managed restricted-source grants and fail-closed authorization enforcement remain prerequisites before exposure or mirror write. Keep the two `[DEV SAMPLE]` Money pages until a separate deletion decision is made.

Decision on samples: keep both pages for now because authenticated visual verification remains blocked and the records are the current numeric Money regression fixture. The typed-envelope plan is documented in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; Engineering Delivery is the next candidate, pending a source-family authorization decision.

The source-family decision and schema capture are recorded: use the existing CR8W Engineering Delivery data source, not the System Admin master sources. A bounded read-only aggregate found one non-archived `Blocked` record. Remaining prerequisites are server-side restricted-source enforcement and a named server-managed user grant policy; do not expose or mirror-write the source until those are implemented.

The user privately reset the individual Supabase password and authenticated successfully. Authenticated visual verification is complete: Overview, Stations, and Moves rendered on `/moves` after fixing custom-domain API routing and guarding the calendar response shape. No mutations were submitted.

Do not rotate or expose the operator token unless access is intentionally transferred.
