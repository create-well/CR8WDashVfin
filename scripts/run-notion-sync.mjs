#!/usr/bin/env node
// Operator runner for the Notion -> Supabase mirror sync.
//
//   node scripts/run-notion-sync.mjs                 # dry-run, all sources (default)
//   node scripts/run-notion-sync.mjs --write         # real mirror write
//   node scripts/run-notion-sync.mjs --sources people,money   # targeted
//
// Env: loads .env.local if present (real environment variables win). Requires
// NOTION_API_KEY plus SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (runSync reads
// mirror metadata even in dry-run mode). See docs/NOTION_SYNC_OPERATIONS.md.
//
// Operator rule: always dry-run first, inspect counts and validationErrors,
// then re-run with --write. This script refuses to write when a dry-run of the
// same sources has failed sources or validation errors in the SAME invocation
// sequence is not tracked here — the human operator owns that sequence.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundleTs, loadLocalEnv, REPO_ROOT } from './notion-operator-lib.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const sourcesIdx = args.findIndex((arg) => arg === '--sources');
const sourcesFilter = sourcesIdx >= 0 ? args[sourcesIdx + 1] : null;
if (sourcesIdx >= 0 && !sourcesFilter) {
  console.error('Usage: node scripts/run-notion-sync.mjs [--write] [--sources key,key]');
  process.exit(2);
}

loadLocalEnv();

const required = ['NOTION_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set them in the environment or in .env.local. Validate with: node scripts/validate-vercel-env.mjs');
  process.exit(2);
}

const tmpDir = mkdtempSync(path.join(tmpdir(), 'cr8w-sync-'));
const bundlePath = path.join(tmpDir, 'sync-bundle.cjs');

const entry = `
const { runSync } = require(${JSON.stringify(path.join(REPO_ROOT, 'api', 'notion-sync.js'))});
const { ENABLED_NOTION_SOURCES } = require(${JSON.stringify(path.join(REPO_ROOT, 'api', 'notion-sources.js'))});
(async () => {
  const sourcesFilter = process.env.CR8W_SYNC_SOURCES ? process.env.CR8W_SYNC_SOURCES.split(',').map((s) => s.trim()) : null;
  const entries = sourcesFilter
    ? ENABLED_NOTION_SOURCES.filter(([key]) => sourcesFilter.includes(key))
    : ENABLED_NOTION_SOURCES;
  if (entries.length === 0) { console.error('No sources matched CR8W_SYNC_SOURCES=' + process.env.CR8W_SYNC_SOURCES); process.exit(2); }
  const result = await runSync(process.env.CR8W_SYNC_DRY_RUN !== 'false', entries);
  console.log(JSON.stringify(result));
})().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
`;

try {
  bundleTs(entry, bundlePath);
  const run = spawnSync(process.execPath, [bundlePath], {
    env: {
      ...process.env,
      CR8W_SYNC_DRY_RUN: write ? 'false' : 'true',
      CR8W_SYNC_SOURCES: sourcesFilter ?? '',
    },
    encoding: 'utf8',
  });
  if (run.status !== 0) {
    console.error(run.stderr || 'Sync bundle failed');
    process.exit(run.status ?? 1);
  }
  const result = JSON.parse(run.stdout.trim().split('\n').pop());
  printSummary(result);
  const failed = result.failedSources?.length ?? 0;
  const validationErrors = result.validationErrors?.length ?? 0;
  process.exit(failed || validationErrors ? 1 : 0);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

function printSummary(result) {
  console.log(`\nnotion-sync ${result.dryRun ? 'DRY-RUN' : 'WRITE'}  runId=${result.runId}  writer=${result.writer}`);
  console.log(`recordSchemaVersion=${result.recordSchemaVersion}  typedSources=${(result.typedSources ?? []).join(',') || 'none'}`);
  for (const [source, count] of Object.entries(result.counts ?? {})) {
    console.log(`  ${source}: ${count} records`);
  }
  console.log(`recordsSeen=${result.recordsSeen}  writes=${result.writes}  validationErrors=${result.validationErrors?.length ?? 0}`);
  for (const failure of result.failedSources ?? []) {
    console.log(`  FAILED ${failure.source}: ${failure.error}`);
  }
  for (const issue of (result.validationErrors ?? []).slice(0, 5)) {
    console.log(`  VALIDATION ${issue.path}: ${issue.message}`);
  }
  if (!result.dryRun && result.ok && !(result.failedSources?.length)) {
    console.log('\nVerify after write: GET /api/dashboard-sync (counts + mirrorUpdatedAt), then the dashboard UI.');
  }
}
