# Next Action

Trace the populated Production `/system` page to identify the LCP element and layout-shift contributors before making any UI or performance code changes.

## Fresh baseline

Captured 2026-08-29T13:59:12.018Z with no Lighthouse runtime error:

| Metric | Value |
|---|---:|
| Performance | 79 |
| Accessibility | 92 |
| Best Practices | 96 |
| SEO | 58 |
| LCP | 3.6386 s |
| CLS | 0.16885 |
| FCP | 2.6177 s |
| TTI | 3.6386 s |

## Acceptance criteria

1. Confirm the trace targets the current production deployment and populated `/system` view.
2. Identify the LCP element and the top layout-shift contributors.
3. Record trace findings without credentials, cookies, raw Notion records, or private request bodies.
4. Propose one minimal behavior-preserving fix only after the evidence is captured.
5. Re-run Lighthouse after the fix and compare against this baseline.
