# Next Action

Deployment is complete: commit `4eb77f0` is Ready as `dxSa9vxPiRMSDtY4JLfEPKkMFnxN` and aliased to `https://www.cr8w.com`. The fail-closed authorization and typed envelope parser are deployed.

The latest production deployment is `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU`; the live homepage returned HTTP 200 and `/api/dashboard-sync` returned HTTP 200 with Notion freshness metadata and 6 tasks / 6 stations.

Current status: clean production deployment, HTTP route/API checks, deployed-asset checks, post-deployment monitoring, and authenticated visual verification are complete. Overview, Stations, and Moves rendered successfully on `/moves`; no mutations were submitted.

After UI testing, delete only the two labeled sample pages if they are no longer needed. Keep the source registry and typed property normalization.

Next development cycle: obtain the exact existing production Notion sync operator token through an approved secure local channel and rerun the protected dry-run. A non-empty 50-character local value was rejected with HTTP 401 and has been removed; do not generate or rotate a replacement. The linked Master System and five operational schemas are captured in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; the typed envelope parser is now integrated and tested. Engineering Delivery remains restricted until a named server-managed grant is created and separately validated. Keep the two `[DEV SAMPLE]` Money pages until a separate deletion decision is made.

Decision on samples: keep both pages for now because they remain the current numeric Money regression fixture. The typed-envelope plan is documented in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; Engineering Delivery authorization is fail-closed and deployed, pending an explicit user grant if exposure is requested.

The source-family decision, schema capture, and server enforcement are recorded: use the existing CR8W Engineering Delivery data source, not the System Admin master sources. A bounded read-only aggregate found one non-archived `Blocked` record. The endpoint now rejects missing/invalid authentication and requires an explicit Engineering Delivery capability; do not expose or mirror-write the source until an authorized grant is intentionally created.

The user privately reset the individual Supabase password and authenticated successfully. Authenticated visual verification is complete: Overview, Stations, and Moves rendered on `/moves` after fixing custom-domain API routing and guarding the calendar response shape. No mutations were submitted.

Do not rotate or expose the operator token unless access is intentionally transferred.
