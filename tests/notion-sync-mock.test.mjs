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

test('dry-run follows Notion cursors and stops at the configured source limit', async () => {
  const server = await startMockNotionServer({ recordsPerSource: 3, maxPageSize: 1 });
  try {
    const result = await runWorkerWithArgs(['--dry-run', '--source=projects', '--limit=2'], {
      NOTION_API_KEY: 'mock-notion-key',
      NOTION_API_URL: mockNotionUrl(server),
    });
    assert.equal(result.code, 0, result.stderr);
    const summary = JSON.parse(result.stdout.trim());
    assert.equal(summary.total_planned, 2);
    assert.equal(summary.sources[0].fetched, 2);
    assert.equal(summary.sources[0].cursor_advanced, false);
    assert.deepEqual(server.requests.map(request => request.body), [
      { page_size: 2 },
      { page_size: 1, start_cursor: 'cursor-1' },
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('write mode resumes, clears, and preserves checkpoints around durable writes', async () => {
  const result = await runWorkerWithArgs(['tests/notion-sync-worker-write-fixture.ts'], {});
  assert.equal(result.code, 0, result.stderr);
});

function runWorkerWithArgs(args, env) {
  return new Promise((resolve, reject) => {
    const [firstArg, ...remainingArgs] = args;
    const isFixture = firstArg?.endsWith('.ts');
    const script = isFixture ? firstArg : 'scripts/notion-sync-worker.ts';
    const scriptArgs = isFixture ? remainingArgs : args;
    const child = spawn(process.execPath, ['--experimental-strip-types', script, ...scriptArgs], {
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

test('write mode fails closed without NOTION_SYNC_WRITE_APPROVED=true', async () => {
  const result = await runWorkerWithArgs(['--write'], {
    NOTION_API_KEY: 'mock-notion-key',
    NOTION_SYNC_WRITE_APPROVED: 'false',
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Write mode is refused/);
  assert.equal(result.stdout.trim(), '');
});

test('missing NOTION_API_KEY fails closed before any network activity', async () => {
  const server = await startMockNotionServer();
  try {
    const result = await runWorker({
      NOTION_API_KEY: '',
      NOTION_API_URL: mockNotionUrl(server),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /NOTION_API_KEY is required/);
    assert.equal(result.stdout.trim(), '');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
