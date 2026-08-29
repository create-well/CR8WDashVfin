# Provider Configuration

This file defines capability routing only. It intentionally contains no API keys, OAuth tokens, cookies, private URLs, or unredacted production data. Each receiving platform must authenticate independently through its own secret manager or connector configuration.

## Approved provider roles

| Provider | Primary role | Permitted inputs | Expected output | Credential handling |
|---|---|---|---|---|
| Notion AI | Operational documentation and source-context synthesis | Repository handoff, approved Notion pages, redacted validation summaries | Updated plans, decisions, documentation drafts, source-linked summaries | Use the authenticated Notion workspace. Never paste a Notion integration token into a prompt or repository file. |
| Perplexity Max | External research and public evidence cross-checking | Public URLs, deployment metadata, redacted metrics, public API documentation | Cited evidence table, uncertainty notes, current-source cross-check | Use Perplexity’s own authenticated session or secret store. Never send private workspace content or production credentials. |
| Gemini Pro | Implementation review, test analysis, and performance interpretation | Redacted handoff, source diffs, test output, Lighthouse metrics, public documentation | Structured review, code suggestions, risk analysis, next action | Use Gemini’s own authenticated session or secret store. Never include secrets, cookies, or raw private records. |

## Integration contract

All providers receive the same redacted project context from `docs/CONTINUATION_HANDOFF.md` and `.handoff/STATE.md`. The provider adapter should pass these fields:

| Field | Required | Rule |
|---|---:|---|
| `project` | Yes | `create-well/CR8WDashVfin` |
| `branch` | Yes | Current feature branch or explicitly verified `main` |
| `task_role` | Yes | One of `research`, `implementation`, `review`, `test-analysis`, `release-summary` |
| `source_of_truth` | Yes | `Notion` |
| `runtime_boundary` | Yes | `Supabase` |
| `deployment_id` | Yes | Redacted deployment identifier only |
| `evidence` | Yes | Redacted facts with timestamp and source URL |
| `secrets_present` | Yes | Always `false` in transferred context |
| `approval_required` | Yes | `true` for production writes, merges, deploy promotions, credential changes, or Notion mutations |
| `next_action` | Yes | One bounded action from `.handoff/NEXT_ACTION.md` |

## Routing policy

Use **Notion AI** when the task is primarily about operational context, documentation, or decisions already represented in Notion. Use **Perplexity Max** when the task requires current public web evidence or independent citation. Use **Gemini Pro** when the task requires implementation reasoning, test interpretation, or performance analysis. Do not use provider switching to bypass an approval gate.

## Handoff prompt envelope

```json
{
  "project": "create-well/CR8WDashVfin",
  "task_role": "test-analysis",
  "source_of_truth": "Notion",
  "runtime_boundary": "Supabase",
  "orchestration_layer": "Manus API v2",
  "secrets_present": false,
  "approval_required": true,
  "context_files": ["docs/CONTINUATION_HANDOFF.md", ".handoff/STATE.md", ".handoff/VALIDATION.md"],
  "next_action": "Run or interpret the fresh Lighthouse audit for Production /system"
}
```

## Provider-specific prompts

### Notion AI

> Use the attached redacted handoff as the working context. Preserve Notion as source of truth and do not invent database fields. Summarize the verified production state, record the Lighthouse metrics in the operational documentation, and flag any claim that is not backed by a dated validation artifact. Do not request or expose credentials.

### Perplexity Max

> Cross-check only public claims in the redacted handoff: production URL, deployment ID, PR status, Lighthouse output, and relevant platform documentation. Return sources, dates, confidence, and contradictions. Do not access or request private workspace data, tokens, cookies, or raw Notion records.

### Gemini Pro

> Review the redacted repository handoff and Lighthouse metrics. Explain the dominant performance bottleneck and propose the smallest behavior-preserving implementation step. Do not edit code, change deployment settings, mutate Notion, or handle credentials until explicitly approved.

## Failover and rate limits

Provider failover is allowed for capability or availability only. If a provider is rate-limited, do not retry immediately. Continue with already available evidence, record the provider as unavailable, and wait for the provider’s documented retry window. Never silently downgrade a security-sensitive action to a less-authorized provider.

## Production approval gates

Explicit human approval is required before sending any message externally, changing Vercel or Supabase configuration, changing a Notion schema, writing or deleting Notion data, starting a production workflow, merging a branch, or promoting a deployment. Read-only Lighthouse and public-page inspection do not require approval.

**Last updated:** 2026-08-29
