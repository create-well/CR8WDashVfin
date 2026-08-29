# Production `/system` Lighthouse and Sync Verification

**Date:** 2026-08-29

## Audit Conditions

The authenticated My Browser session loaded `https://cr8w-dash-vfin.vercel.app/system` and showed `Synced 0s ago`, `Last sync 8:59:10 AM`, and populated inventory counts: 5 tasks, 6 stations, 9 messages, 1 CoFlow date, and 1 brain dump. The Lighthouse run targeted the same Production URL from a clean headless Chromium profile; the populated authenticated state was separately confirmed in the connected browser session.

## Lighthouse Results

| Metric | Fresh result | Prior baseline | Change |
|---|---:|---:|---:|
| Performance | 78/100 | 78/100 | 0 |
| Accessibility | 92/100 | 92/100 | 0 |
| Best Practices | 96/100 | 96/100 | 0 |
| SEO | 58/100 | 58/100 | 0 |
| Cumulative Layout Shift | 0.1689 | 0.1689 | -0.0000 |
| Largest Contentful Paint | 3.649 s | 3.670 s | -0.021 s |

Raw Lighthouse values were CLS `0.1688526623` and LCP `3649.0375 ms`; the displayed comparison values are rounded to the prior report's precision.

Additional fresh metrics: First Contentful Paint `2.632 s`, Total Blocking Time `54 ms`, Speed Index `2.632 s`, and Time to Interactive `3.649 s`.

The principal Lighthouse findings were unchanged: insufficient color contrast, insufficiently legible font sizes, indexing blocked, invalid `robots.txt`, and the existing performance observations for CLS, forced reflow, and network dependency depth.

## Supabase Edge-Function Verification

The authenticated read-only sync probe passed with HTTP `200` and returned the expected typed arrays. The response contained 5 tasks, 6 stations, 0 forum posts, 9 messages, 1 brain dump, 0 announcements, 0 workshops, 1 CoFlow date, 0 check-ins, 0 well notes, and 110 calendar events. The unauthenticated sync probe correctly returned HTTP `401`.

The edge health endpoint returned HTTP `401` without an authorization header because the Supabase gateway requires the public authorization contract before the function handler runs. This is expected for the current gateway configuration; authenticated sync is the relevant application path and passed.

## Runtime Anomalies

The current Production deployment `dpl_38prLHjTfJGAEQ5LghVHsEap7Zwa` is READY. Its scoped runtime logs contained successful `/api/server` responses, three expected `401` probes, and one Node `DEP0169` `url.parse()` deprecation warning. No current-deployment HTTP `500` responses were found.

A broader 24-hour grouped error query contained two residual groups: 16 `DEP0169` warnings on `/api/server` and 4 historical `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` errors on an obsolete deployment. A 30-minute 500 query showed six historical failures on deployment `dpl_AU3k8Jo8xvSCRYg7yuW2EjWW9oVg`, all caused by `SyntaxError: Invalid regular expression: missing /` while serving the old `/api/server/sync` path. These failures are not present on the current READY deployment and are not used by the live client after the edge-function routing fix.

## Evidence Sources

- Raw Lighthouse report: `/tmp/cr8w-lighthouse-system.json`
- Extracted metrics: `/tmp/cr8w-lighthouse-metrics.json`
- Lighthouse issue summary: `/tmp/cr8w-lighthouse-issues.json`
- Current Production deployment: `dpl_38prLHjTfJGAEQ5LghVHsEap7Zwa`
- Live URL: `https://cr8w-dash-vfin.vercel.app/system`

## Conclusion

The data-sync failure is resolved and the populated-state audit is unblocked. Fresh performance metrics are effectively unchanged from the prior baseline, with LCP improving by approximately 21 ms and CLS remaining unchanged at 0.1689. No active sync failure or current-deployment 500 anomaly was observed; the remaining log noise is an old deployment's legacy route failure plus a non-blocking Node deprecation warning.

## References

[1]: https://cr8w-dash-vfin.vercel.app/system "CR8W Dash vfin Production System"
[2]: https://vercel.com/docs/deployments/troubleshoot-project-collaboration "Vercel deployment troubleshooting"
