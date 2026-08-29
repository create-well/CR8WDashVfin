# Next Action

## Single highest-leverage action

Restore or authorize a successful authenticated data sync for the Production `/system` route, then rerun the Lighthouse audit only after the page visibly contains populated data.

## Acceptance criteria

1. The audit targets the current Production `/system` route.
2. The authenticated populated state is visibly present, not sync failure, consent-required, or zero-inventory state.
3. The report records fresh Performance, Accessibility, Best Practices, SEO, CLS, and LCP values with timestamp and test conditions.
4. CLS and LCP are compared directly with the prior recorded values of 0.1689 and 3.67 seconds.
5. Any follow-up code change is separately planned, minimally scoped, and validated.

## Stop conditions

Stop if the required authentication, consent, Notion access, Supabase operational access, or deployment permissions are unavailable. Do not bypass the source-of-truth rules, mutate the Notion schema, write production data, or make layout/SEO changes as part of the audit.
