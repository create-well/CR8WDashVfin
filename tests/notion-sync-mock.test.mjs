import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { startMockNotionServer, mockNotionUrl } from './mock-notion-database.mjs';

const repoRoot = new URL('..', import.meta.url).pathname;

function resolveWorkerCommand() {
  const candidates = [
    { entrypoint: 'scripts/notion-sync-worker.mjs', nodeArgs: [] },
    { entrypoint: 'scripts/notion-sync-worker.js', nodeArgs: [] },
    { entrypoint: 'scripts/notion-sync-worker.ts', nodeArgs: ['--experimental-strip-types'] },
  ];

  for (const candidate of candidates) {
    if (!existsSync(path.join(repoRoot, candidate.entrypoint))) continue;
    if (candidate.nodeArgs.includes('--experimental-strip-types')
      && !process.allowedNodeEnvironmentFlags.has('--experimental-strip-types')) {
      return { skipReason: 'Notion sync worker requires --experimental-strip-types, which this Node runtime does not support.' };
    }
    return candidate;
  }

  return { skipReason: 'No notion sync worker entrypoint exists in this repository checkout.' };
}

function runWorker(env, worker) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...worker.nodeArgs, worker.entrypoint, '--dry-run', '--limit=1'], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

test('dry-run syncs one normalized mock page from each source without writes', async (t) => {
  const worker = resolveWorkerCommand();
  if ('skipReason' in worker) {
    t.skip(worker.skipReason);
    return;
  }

  const server = await startMockNotionServer();
  try {
    const result = await runWorker({ NOTION_API_KEY: 'mock-notion-key', NOTION_API_URL: mockNotionUrl(server) }, worker);
    assert.equal(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout.trim());
    assert.equal(summary.mode, 'dry-run');
    assert.equal(summary.contract_version, '1.0.0');
    assert.equal(summary.total_planned, 5);
    assert.equal(summary.total_dead_letters, 0);
    assert.deepEqual(summary.sources.map(source => source.fetched), [1, 1, 1, 1, 1]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
