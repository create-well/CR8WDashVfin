#!/usr/bin/env node
/**
 * Collects audit events for branch protection, rulesets, environments, and
 * workflow bypass/approval activity. Read-only; designed for GitHub Actions.
 *
 * Required: GH_TOKEN with access to the relevant organization audit log.
 * For personal-account repositories, set AUDIT_MODE=repo-events and provide
 * a token that can read repository events; organization audit events provide
 * the strongest coverage.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

const repo = process.env.REPO || "create-well/CR8WDashVfin";
const [owner, name] = repo.split("/");
const output = process.env.OUTPUT || "governance-audit.jsonl";
const sinceHours = Number(process.env.SINCE_HOURS || "3");
const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();
const auditMode = process.env.AUDIT_MODE || "org-audit";
const apiVersion = process.env.GITHUB_API_VERSION || "2026-03-10";

if (!owner || !name || repo.split("/").length !== 2) throw new Error("REPO must be OWNER/REPOSITORY");
if (!Number.isFinite(sinceHours) || sinceHours <= 0 || sinceHours > 168) throw new Error("SINCE_HOURS must be 0 < value <= 168");

function gh(path, args = []) {
  const raw = execFileSync("gh", ["api", path, "--header", `X-GitHub-Api-Version: ${apiVersion}`, ...args], { encoding: "utf8" });
  return JSON.parse(raw || "[]");
}

function redact(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(password|secret|token|client_secret|access_token|refresh_token)\s*[:=]\s*[^,\s}]+/gi, "$1=[REDACTED]");
}

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)]));
  return redact(value);
}

let events;
if (auditMode === "org-audit") {
  const query = `repo:${repo} created:>=${since}`;
  events = gh(`orgs/${owner}/audit-log`, ["--method", "GET", "--paginate", "--slurp", "-f", `phrase=${query}`, "-f", "include=all"]);
  events = events.flat ? events.flat() : events;
} else if (auditMode === "repo-events") {
  events = gh(`repos/${owner}/${name}/events`, ["--method", "GET", "-f", "per_page=100"]);
  events = events.filter((event) => new Date(event.created_at || event.updated_at || 0) >= new Date(since));
} else {
  throw new Error("AUDIT_MODE must be org-audit or repo-events");
}

const governanceTerms = /(branch[_ -]?protection|protected[_ -]?branch|ruleset|environment|deployment|bypass|review|workflow|security)/i;
const filtered = events.filter((event) => governanceTerms.test(JSON.stringify(event)));
const header = {
  record_type: "github_governance_audit",
  generated_at: new Date().toISOString(),
  repository: repo,
  since,
  source: auditMode,
  event_count: filtered.length,
};

writeFileSync(output, JSON.stringify(header) + "\n");
for (const event of filtered) appendFileSync(output, JSON.stringify(scrub(event)) + "\n");
console.log(JSON.stringify(header));
