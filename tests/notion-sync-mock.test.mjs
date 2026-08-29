import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startMockNotionServer, mockNotionUrl } from './mock-notion-database.mjs';

function runWorker(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', 'scripts/notion-sync-worker.ts', '--dry-run', '--limit=1'], {
      cwd: new URL('..', import.meta.url).pathname,
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

test('dry-run syncs one normalized mock page from each source without writes', async () => {
  const server = await startMockNotionServer();
  try {
    const result = await runWorker({ NOTION_API_KEY: 'mock-notion-key', NOTION_API_URL: mockNotionUrl(server) });
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
