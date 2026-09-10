# Next Action

Deploy commit `e3baa57` from a clean archive, then verify `https://www.cr8w.com/moves` in the authenticated team session across Overview, Journey, Stations, Moves, and Forum tabs.

The latest production deployment is `dpl_B4ys56zRWmcfy8w85ehrWTdiNBAU`; the live homepage returned HTTP 200 and `/api/dashboard-sync` returned HTTP 200 with Notion freshness metadata and 6 tasks / 6 stations.

Current status: isolated local browser verification and full Vitest validation are complete. Authenticated production visual verification remains **NOT NOW** because prior My Browser screenshot, DOM view, and console artifact collection failed at the Chrome-extension layer.

After UI testing, delete only the two labeled sample pages if they are no longer needed. Keep the source registry and typed property normalization.

Secondary follow-ups: decide whether to delete the two `[DEV SAMPLE]` Money pages after UI review; then plan the typed property envelope and next approved Notion source discovery. Do not make either change as part of this verification pass.

Decision on samples: keep both pages for now because authenticated visual verification remains blocked and the records are the current numeric Money regression fixture. The typed-envelope plan is documented in `docs/TYPED_PROPERTY_ENVELOPE_PLAN.md`; Engineering Delivery is the next candidate, pending a source-family authorization decision.

Do not rotate or expose the operator token unless access is intentionally transferred.
