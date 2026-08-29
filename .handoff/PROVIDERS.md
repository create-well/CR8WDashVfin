# Provider Routing

| Role | Preferred provider | Fallback | Allowed work | Secret rule |
|---|---|---|---|---|
| Research | Perplexity Max | Gemini Pro or Notion AI | Cross-check public deployment, API, and performance evidence | No private tokens or unredacted production data |
| Implementation | Manus or Gemini Pro | Notion AI for documentation-only work | Feature-branch code changes with tests | Authenticate independently |
| Review | Manus or Gemini Pro | Perplexity Max for public evidence review | Diff, architecture, and risk review | Never paste secrets |
| Test analysis | Manus or Gemini Pro | Notion AI | Interpret redacted logs and test output | Keep request IDs and error classes only |
| Release summary | Notion AI or Manus | Gemini Pro | Update handoff and next action | Redacted state only |

## Switching rule

Switch providers for capability or availability only. Do not silently switch providers for a production write, credential change, Notion mutation, deployment promotion, or merge. Require explicit human approval for those actions.

## Manus API boundary

Use Manus API v2 for task orchestration, continuation, structured output, webhooks, and connector-enabled agent work. Store task IDs and project IDs only when safe. Use webhooks for production result delivery and verify signatures. Manus API does not replace Notion or Supabase for dashboard data.
