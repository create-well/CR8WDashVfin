# Production Lighthouse Audit

**Target:** https://cr8w-dash-vfin.vercel.app/system  
**Captured:** 2026-08-29T13:59:12.018Z  
**Runtime error:** None  
**Audit mode:** Lighthouse CLI, production URL, headless Chromium, telemetry reporting disabled

## Fresh metrics

| Metric | Result | Lighthouse score / status |
|---|---:|---|
| Performance | 79/100 | Passed |
| Accessibility | 92/100 | Passed |
| Best Practices | 96/100 | Passed |
| SEO | 58/100 | Needs follow-up |
| Largest Contentful Paint (LCP) | 3.64 s, displayed as 3.6 s | Needs improvement |
| Cumulative Layout Shift (CLS) | 0.16885, displayed as 0.169 | Needs improvement |
| First Contentful Paint | 2.62 s, displayed as 2.6 s | Needs improvement |
| Time to Interactive | 3.64 s, displayed as 3.6 s | Passed by audit threshold |

## Comparison with prior baseline

The prior failure-state baseline recorded Performance 78, Accessibility 92, Best Practices 96, SEO 58, CLS 0.1689, and LCP 3.67 s. The fresh run is effectively unchanged for CLS and LCP: CLS is approximately 0.00005 lower and LCP is approximately 0.03 s faster. This is not a meaningful performance improvement and should be treated as a stable baseline, not a resolved bottleneck.

## Interpretation

The page loaded without a Lighthouse runtime error. The next performance work should target the dominant LCP path and layout stability rather than authentication or Notion sync. Do not make a code change until the LCP element and the sources of layout shift are identified in a trace or the detailed Lighthouse audit.

## Safe next action

Use Chrome DevTools performance tracing on the populated `/system` page, identify the LCP element and layout-shift contributors, then propose one minimal behavior-preserving fix. Preserve the current metrics as the comparison baseline.

No credentials, cookies, raw Notion records, or private request bodies are stored in this artifact.
