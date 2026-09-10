import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { verifyProductionBackup } from '../tools/rollback-gate/runner.ts';

const now = '2026-09-10T20:00:00Z';
const generationId = 'gen-1';
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'cr8w-runner-'));
  await mkdir(join(root, 'backups'));
  const snapshots = { source: 'people', generationId, capturedAt: now, records: [{ sourcePageId: 'page-1', source: 'people', properties: {} }] };
  const metadata = { source: 'notion', syncRunId: 'run-1', generationId, mirrorUpdatedAt: now, sourceLastEditedAt: null, counts: { people: 1 } };
  const files = [{ key: 'cr8w_notion_mirror_people', name: 'people.json', value: snapshots }, { key: 'cr8w_notion_sync_meta', name: 'sync-meta.json', value: metadata }];
  const entries = [];
  for (const file of files) {
    const content = JSON.stringify(file.value);
    await writeFile(join(root, 'backups', file.name), content);
    entries.push({ backupId: `backup-${file.name}`, key: file.key, path: `backups/${file.name}`, present: true, byteLength: Buffer.byteLength(content), sha256: createHash('sha256').update(content).digest('hex'), capturedAt: now });
  }
  await writeFile(join(root, 'manifest.json'), JSON.stringify({ version: 1, generationId, attemptedWriteKeys: files.map((file) => file.key), entries }));
  return root;
}
function runCli(root: string, args: string[] = []) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', 'tools/rollback-gate/cli.ts', '--root', root, '--json', ...args], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, NODE_NO_WARNINGS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
test('runner validates a complete production backup from disk', async () => {
  const root = await fixture();
  const result = await verifyProductionBackup({ root });
  assert.deepEqual(result.snapshotSources, ['people']);
  assert.equal(result.verifiedFiles, 2);
  assert.equal(result.generationId, generationId);
});
test('runner rejects a snapshot with a mismatched generation', async () => {
  const root = await fixture();
  const path = join(root, 'backups/people.json');
  const snapshot = JSON.parse(await readFile(path, 'utf8'));
  snapshot.generationId = 'gen-2';
  const content = JSON.stringify(snapshot);
  await writeFile(path, content);
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  manifest.entries[0].byteLength = Buffer.byteLength(content);
  manifest.entries[0].sha256 = createHash('sha256').update(content).digest('hex');
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(() => verifyProductionBackup({ root }), /generation/);
});
test('runner rejects metadata count drift', async () => {
  const root = await fixture();
  const path = join(root, 'backups/sync-meta.json');
  const metadata = JSON.parse(await readFile(path, 'utf8'));
  metadata.counts.people = 99;
  const content = JSON.stringify(metadata);
  await writeFile(path, content);
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  manifest.entries[1].byteLength = Buffer.byteLength(content);
  manifest.entries[1].sha256 = createHash('sha256').update(content).digest('hex');
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(() => verifyProductionBackup({ root }), /count mismatch/);
});
test('CLI returns machine-readable success and failure exit codes', async () => {
  const root = await fixture();
  const pass = await runCli(root);
  assert.equal(pass.code, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).ok, true);
  await writeFile(join(root, 'backups/orphan.json'), 'orphan');
  const fail = await runCli(root);
  assert.equal(fail.code, 1);
  assert.equal(JSON.parse(fail.stderr).ok, false);
  assert.match(JSON.parse(fail.stderr).error, /unreferenced backup file/);
});
