# `GOVERNANCE_AUDIT_TOKEN` Setup Guide

This guide configures the secret used by the governance audit workflow for `create-well/CR8WDashVfin`. It deliberately contains **no token value**. The secret must be entered directly into GitHub or piped from a secure local prompt; it must never be sent through chat, committed to Git, or printed in CI logs.

## Recommended credential choices

| Choice | Minimum permission | Best use | Limitation |
|---|---|---|---|
| GitHub App installation token | Only the read permissions exposed by the organization audit-log endpoint, plus repository metadata read where required | Preferred long-lived automation identity with centrally managed rotation | Requires an App, installation, and organization approval process |
| Fine-grained credential | Organization **Administration: read** if exposed for the audit-log endpoint; repository **Metadata: read** | Preferred personal-credential alternative where the endpoint and organization policy support it | The endpoint’s available permissions vary by GitHub account, organization, and plan; verify the API response before relying on it |
| Classic PAT | `read:audit_log` only | Compatibility fallback when the endpoint does not accept the selected fine-grained credential | Use only for an organization owner and set a short expiration; classic PATs are less narrowly resource-scoped |
| Built-in `GITHUB_TOKEN` | `contents: read` | Repository-events fallback already implemented in the workflow | Does not provide equivalent organization audit-log coverage |

The workflow’s full-coverage path requires `GOVERNANCE_AUDIT_TOKEN`. If it is absent, the workflow intentionally uses the built-in read-only token and records a reduced-coverage warning. GitHub’s documentation states that organization secrets are not available to private repositories on GitHub Free, so a repository secret is the safest current placement until the repository plan supports protected organization secrets. [1] [2]

## Create the credential

For a fine-grained credential, select only the `create-well` organization as the resource owner, restrict repository access to `CR8WDashVfin` when the UI permits it, and grant no write, workflow, administration-write, repository-content, issue, pull-request, or secret-management permission. Add organization Administration read only if the audit endpoint’s current permission table exposes that permission for the account.

If the endpoint rejects the fine-grained credential or the organization does not expose a supported read permission, use a classic PAT with the single `read:audit_log` scope. The token owner must satisfy GitHub’s organization audit-log access requirements, normally an organization owner. Set the shortest available expiration, record the owner and expiry in the security inventory, and obtain the organization’s approval if token approval is enabled.

Do not use the token used by a human administrator for routine automation. Prefer a dedicated automation identity or GitHub App. Do not grant `repo`, `admin:org`, `workflow`, `write:org`, `delete_repo`, or any production infrastructure permission merely to make the workflow run.

## Store the secret in GitHub

The recommended location is a **repository Actions secret**. In the GitHub UI, open the repository and select **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Set the name to `GOVERNANCE_AUDIT_TOKEN`, paste the value directly, and save it. GitHub documents this exact repository-secret path and notes that repository collaborators with sufficient access can create repository secrets. [2]

The same operation can be performed through the GitHub CLI without placing the value in shell history:

```bash
# Secure prompt; the token is not echoed.
gh secret set GOVERNANCE_AUDIT_TOKEN \\
  --repo create-well/CR8WDashVfin
```

For a non-interactive secret manager integration, pipe the value over standard input rather than placing it in a command argument:

```bash
secure_secret_manager read github/governance-audit-token | \\
  gh secret set GOVERNANCE_AUDIT_TOKEN \\
    --repo create-well/CR8WDashVfin
```

The placeholder command above is intentionally not executable as written; replace `secure_secret_manager read ...` only with the organization-approved secret-manager command. Never use `echo TOKEN | ...`, because shell history, process inspection, and logs can expose the value.

## Validate without exposing the token

Run the workflow manually with the default 24-hour lookback. Full coverage is confirmed only when the job does **not** emit the reduced-coverage warning and the audit collector successfully queries the organization endpoint. The workflow should produce one scrubbed JSONL artifact.

A safe local API probe can be performed by GitHub administrators using a temporary shell variable that is not printed:

```bash
read -r -s GH_AUDIT_TOKEN
export GH_TOKEN="$GH_AUDIT_TOKEN"
unset GH_AUDIT_TOKEN

# Use a narrow repository phrase and a bounded timestamp.
gh api orgs/create-well/audit-log \\
  --method GET \\
  --paginate \\
  --slurp \\
  -f 'phrase=repo:create-well/CR8WDashVfin' \\
  -f 'include=all' \\
  -H 'X-GitHub-Api-Version: 2026-03-10' \\
  > /tmp/governance-audit-probe.json

unset GH_TOKEN
```

Delete the probe output after review if it contains actor or governance data, and do not upload it as a public artifact. A 401 means the credential is invalid or unavailable. A 403 means the identity, scope, organization policy, endpoint, or plan does not permit the request. A successful repository-events fallback is useful operationally but does not prove organization audit-log access.

## Rotation and incident response

Rotate the credential at least every 30 days, or sooner if the issuing system supports shorter-lived tokens. Create and validate the replacement before revoking the old token, then revoke the old token immediately after a successful run. If a token appears in logs, chat, a commit, a screenshot, or an uncontrolled artifact, revoke it first and investigate its audit usage; redaction is not a substitute for revocation.

Keep an inventory record containing the credential type, owner or App, creation time, expiry, last validation run, intended endpoint, and revocation procedure. Do not record the token value. Review the audit workflow’s artifact access and retention settings at the same time.

## Configuration contract

The committed workflow implements this contract:

| Condition | Mode | Token source | Coverage label |
|---|---|---|---|
| `GOVERNANCE_AUDIT_TOKEN` exists | `org-audit` | Repository secret | Full organization audit-log coverage, subject to endpoint permissions |
| Secret is absent | `repo-events` | Built-in `github.token` | Reduced repository-event coverage with a visible warning |

The fallback is fail-safe with respect to privilege: it does not elevate the built-in token, request write permissions, or expose a service credential. Configure the secret when complete governance coverage is required.

## References

[1] [GitHub REST API — Get the audit log for an organization](https://docs.github.com/en/rest/orgs/orgs#get-the-audit-log-for-an-organization)
[2] [GitHub Docs — Using secrets in GitHub Actions](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
[3] [GitHub Docs — Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
