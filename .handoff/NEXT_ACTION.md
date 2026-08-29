# Next Action

Run a fresh Lighthouse audit against the populated Production `/system` page.

## Acceptance criteria

1. Confirm the audit targets the current production deployment, not a failure-state preview.
2. Record Performance, Accessibility, Best Practices, SEO, CLS, and LCP.
3. Compare CLS and LCP with the prior baseline of CLS `0.1689` and LCP `3.67 seconds`.
4. Do not edit application code until the comparison identifies a measured regression or opportunity.
5. Store only redacted metrics and URLs. Do not store credentials, cookies, page content, or tokens.
