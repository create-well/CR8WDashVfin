import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const verifier = path.join(projectRoot, 'scripts', 'verify-v2-rollback-backup.mjs');
const keys = [
  'cr8w_notion_mirror_flows',
  'cr8w_notion_mirror_content',
  'cr8w_notion_sync_meta',
];

async function runVerifier(manifest, backupDir) {
  const manifestPath = path.join(backupDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [verifier, '--manifest', manifestPath, '--backup-dir', backupDir, '--json'], { cwd: projectRoot });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr, result: JSON.parse(stdout) }));
  });
}

async function makeBackup(t, { absentContent = false } = {}) {
  const backupDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cr8w-v2-backup-'));
  t.after(() => fs.rm(backupDir, { recursive: true, force: true }));
  const entries = [];
  for (const [index, key] of keys.entries()) {
    const absent = key === 'cr8w_notion_mirror_content' && absentContent;
    if (absent) {
      entries.push({ key, present: false });
      continue;
    }
    const file = `${key}.json`;
    const source = key.replace('cr8w_notion_mirror_', '');
    const value = key === 'cr8w_notion_sync_meta'
      ? {
        source: 'notion',
        mirrorUpdatedAt: '2026-09-10T13:23:36.781Z',
        sourceLastEditedAt: null,
        syncRunId: 'notion-test-run',
        counts: { flows: 1, content: 0 },
        recordSchemaVersion: 2,
        typedSources: ['flows'],
      }
      : [{
        recordSchemaVersion: 2,
        source,
        sourcePageId: `page-${index}`,
        sourceUrl: null,
        sourceLastEditedAt: null,
        archived: false,
        properties: {},
      }];
    const bytes = Buffer.from(JSON.stringify(value));
    await fs.writeFile(path.join(backupDir, file), bytes);
    entries.push({
      key,
      present: true,
      file,
      byteLength: bytes.byteLength,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return { backupDir, entries };
}

test('accepts an intact manifest and preserves an intentionally absent key', async (t) => {
  const { backupDir, entries } = await makeBackup(t, { absentContent: true });
  const result = await runVerifier({ backupId: 'backup-valid', capturedAt: new Date().toISOString(), keys: entries }, backupDir);

  assert.equal(result.code, 0);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.errorCount, 0);
  assert.deepEqual(result.result.verified.find((entry) => entry.key === 'cr8w_notion_mirror_content'), { key: 'cr8w_notion_mirror_content', present: false });
});

test('rejects a tampered snapshot whose digest or byte length changed', async (t) => {
  const { backupDir, entries } = await makeBackup(t);
  await fs.writeFile(path.join(backupDir, 'cr8w_notion_mirror_flows.json'), '{"tampered":true}');
  const result = await runVerifier({ backupId: 'backup-tampered', capturedAt: new Date().toISOString(), keys: entries }, backupDir);

  assert.equal(result.code, 1);
  assert.equal(result.result.ok, false);
  assert.ok(result.result.errors.some((error) => error.includes('cr8w_notion_mirror_flows')));
});

test('rejects a manifest missing one of the required rollback keys', async (t) => {
  const { backupDir, entries } = await makeBackup(t);
  const incomplete = entries.filter((entry) => entry.key !== 'cr8w_notion_sync_meta');
  const result = await runVerifier({ backupId: 'backup-incomplete', capturedAt: new Date().toISOString(), keys: incomplete }, backupDir);

  assert.equal(result.code, 1);
  assert.equal(result.result.ok, false);
  assert.ok(result.result.message.includes('cr8w_notion_sync_meta'));
});

test('rejects non-boolean present and malformed digest fields', async (t) => {
  const { backupDir, entries } = await makeBackup(t);
  const malformed = entries.map((entry) => ({ ...entry }));
  malformed[0].present = 'true';
  malformed[1].byteLength = String(malformed[1].byteLength);
  malformed[2].sha256 = 'not-a-digest';
  const result = await runVerifier({ backupId: 'backup-malformed-types', capturedAt: new Date().toISOString(), keys: malformed }, backupDir);

  assert.equal(result.code, 1);
  assert.equal(result.result.ok, false);
  assert.ok(result.result.errors.some((error) => error.includes('present must be boolean')));
  assert.ok(result.result.errors.some((error) => error.includes('byteLength must be')));
  assert.ok(result.result.errors.some((error) => error.includes('sha256 must be')));
});

test('rejects semantically invalid source snapshot records', async (t) => {
  const { backupDir, entries } = await makeBackup(t);
  const flows = entries.find((entry) => entry.key === 'cr8w_notion_mirror_flows');
  await fs.writeFile(path.join(backupDir, flows.file), JSON.stringify([{ source: 'content', properties: [], archived: 'no' }]));
  const result = await runVerifier({ backupId: 'backup-invalid-schema', capturedAt: new Date().toISOString(), keys: entries }, backupDir);

  assert.equal(result.code, 1);
  assert.equal(result.result.ok, false);
  assert.ok(result.result.errors.some((error) => error.includes('sourcePageId')));
  assert.ok(result.result.errors.some((error) => error.includes('expected flows')));
  assert.ok(result.result.errors.some((error) => error.includes('properties')));
});
