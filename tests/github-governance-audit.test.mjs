import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("falls back to repo events when org audit endpoint returns 404", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "gh-audit-test-"));
  const ghPath = join(tempDir, "gh");
  const outputPath = join(tempDir, "governance-audit.jsonl");
  const scriptPath = "/home/runner/work/CR8WDashVfin/CR8WDashVfin/scripts/github-governance-audit.mjs";
  const now = new Date().toISOString();

  writeFileSync(
    ghPath,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const path = args[1];
if (path === "orgs/create-well/audit-log") {
  process.stdout.write('[{"message":"Not Found","status":"404"}]');
  process.stderr.write("gh: Not Found (HTTP 404)\\n");
  process.exit(1);
}
if (path === "repos/create-well/CR8WDashVfin/events") {
  process.stdout.write(JSON.stringify([{ type: "workflow_dispatch", created_at: "${now}", payload: { action: "branch_protection" } }]));
  process.exit(0);
}
process.stderr.write("unexpected path: " + path + "\\n");
process.exit(1);
`,
  );
  chmodSync(ghPath, 0o755);

  const result = spawnSync("node", [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${tempDir}:${process.env.PATH}`,
      REPO: "create-well/CR8WDashVfin",
      AUDIT_MODE: "org-audit",
      SINCE_HOURS: "3",
      OUTPUT: outputPath,
      GITHUB_API_VERSION: "2026-03-10",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /falling back to repository events/i);

  const [headerLine] = readFileSync(outputPath, "utf8").trim().split("\n");
  const header = JSON.parse(headerLine);
  assert.equal(header.source, "repo-events-fallback");
  assert.equal(header.event_count, 1);
});
