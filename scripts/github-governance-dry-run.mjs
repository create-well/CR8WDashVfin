#!/usr/bin/env node
/**
 * Read-only governance capability check.
 *
 * This script intentionally performs GET requests only. A successful GET does
 * not guarantee that a subsequent PUT/PATCH will succeed; it reports the
 * evidence needed before an explicit enforcement run.
 *
 * Usage:
 *   node scripts/github-governance-dry-run.mjs
 *   REPO=create-well/CR8WDashVfin node scripts/github-governance-dry-run.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const repo = process.env.REPO || "create-well/CR8WDashVfin";
const [owner, name] = repo.split("/");
if (!owner || !name || repo.split("/").length !== 2) {
  throw new Error("REPO must be in OWNER/REPOSITORY form");
}
const branch = process.env.BRANCH || "main";
const environment = process.env.ENVIRONMENT || "staging-alert-drill";
const apiVersion = process.env.GITHUB_API_VERSION || "2026-03-10";

function gh(path, args = []) {
  try {
    const out = execFileSync("gh", ["api", path, "--header", `X-GitHub-Api-Version: ${apiVersion}`, ...args], {
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1", GH_FORCE_TTY: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const clean = out.replace(/\\x1B\\[[0-?]*[ -\\/]*[@-~]/g, "");
    return { ok: true, status: 200, data: JSON.parse(clean || "null") };
  } catch (error) {
    const stdout = String(error.stdout || "");
    const stderr = String(error.stderr || "");
    const text = `${stdout}\n${stderr}`;
    const status = Number(text.match(/HTTP (\d{3})/)?.[1] || 0);
    let data = null;
    try { data = JSON.parse(stdout); } catch {}
    return { ok: false, status, data, error: text.replace(/\s+/g, " ").trim() };
  }
}

function capability(name, result, interpretation) {
  return {
    capability: name,
    readable: result.ok,
    status: result.status || null,
    interpretation,
    error: result.ok ? undefined : result.error,
  };
}

const results = [];
const repository = gh(`repos/${owner}/${name}`);
results.push(capability("repository_metadata", repository, repository.ok
  ? `Repository is ${repository.data.private ? "private" : "public"}; viewer permissions are not exposed by this probe.`
  : "Repository metadata could not be read."));

const protection = gh(`repos/${owner}/${name}/branches/${encodeURIComponent(branch)}/protection`);
results.push(capability("classic_branch_protection", protection, protection.ok
  ? "Classic protection is readable; configuration writes still require the required repository capability and admin permission."
  : protection.status === 403
    ? "GitHub rejected the protection read; this commonly indicates the private-repository plan limitation or insufficient scope. No write was attempted."
    : "Classic branch protection is not currently readable."));

const rulesets = gh(`repos/${owner}/${name}/rulesets`);
results.push(capability("repository_rulesets", rulesets, rulesets.ok
  ? "Rulesets are readable; inspect returned rules before creating an overlapping rule."
  : "Rulesets are unavailable or the token cannot list them. No ruleset was changed."));

const environments = gh(`repos/${owner}/${name}/environments`);
results.push(capability("environment_management", environments, environments.ok
  ? "Environment inventory is readable; environment protection writes still require a supported plan and admin permission."
  : "Environment inventory is unavailable."));

const targetEnvironment = gh(`repos/${owner}/${name}/environments/${encodeURIComponent(environment)}`);
results.push(capability("target_environment", targetEnvironment, targetEnvironment.ok
  ? "Target environment exists; inspect protection_rules and deployment_branch_policy before changing it."
  : targetEnvironment.status === 404
    ? "Target environment does not exist. Creating it without protection would not be a safe gate."
    : "Target environment could not be read."));

const workflowPermissions = gh(`repos/${owner}/${name}/actions/permissions/workflow`);
results.push(capability("actions_workflow_permissions", workflowPermissions, workflowPermissions.ok
  ? "Repository-wide Actions defaults are readable."
  : "Actions workflow permissions could not be read."));

const teams = gh(`orgs/${owner}/teams`, ["--method", "GET", "--paginate", "--slurp"]);
results.push(capability("organization_team_visibility", teams, teams.ok
  ? "Organization teams are visible to this token; owner slugs can be verified."
  : "Organization teams are not visible to this token; do not invent CODEOWNERS team slugs."));

const report = {
  generated_at: new Date().toISOString(),
  repository: repo,
  branch,
  environment,
  read_only: true,
  note: "This report is evidence for a later explicit apply. It does not prove mutation success and performs no writes.",
  capabilities: results,
};

const output = process.env.OUTPUT || "governance-dry-run.json";
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
