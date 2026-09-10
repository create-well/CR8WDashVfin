import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { validateManifest, verifySnapshotSet, verifyBackupFiles, type BackupManifest } from '../tools/rollback-gate/verify.ts';

const now = '2026-09-10T18:00:00Z';
function manifest(path: string, key = 'cr8w_notion_mirror_people'): BackupManifest {
  const body = Buffer.from('{"records":[]}');
  return { version: 1, generationId: 'gen-1', attemptedWriteKeys: [key], entries: [{ backupId: 'backup-1', key, path, present: true, byteLength: body.byteLength, sha256: createHash('sha256').update(body).digest('hex'), capturedAt: now }] };
}
test('validates strict snapshot and sync metadata semantics', () => {
  assert.doesNotThrow(() => verifySnapshotSet([{ source: 'people', generationId: 'gen-1', capturedAt: now, records: [] }], { source: 'notion', syncRunId: 'run-1', generationId: 'gen-1', mirrorUpdatedAt: now, sourceLastEditedAt: null, counts: { people: 0 } }, 'gen-1'));
  assert.throws(() => verifySnapshotSet([{ source: 'people', generationId: 'gen-2', capturedAt: now, records: [] }], { source: 'notion', syncRunId: 'run-1', generationId: 'gen-1', mirrorUpdatedAt: now, sourceLastEditedAt: null, counts: { people: 0 } }, 'gen-1'), /generation/);
});
test('requires exact attempted-write key coverage', () => {
  assert.throws(() => validateManifest({ ...manifest('people.json'), attemptedWriteKeys: ['people.json', 'meta.json'] }), /missing exact attempted-write keys/);
  assert.throws(() => validateManifest({ ...manifest('people.json'), entries: [{ ...manifest('people.json').entries[0], key: 'other.json' }] }), /missing exact attempted-write keys/);
});
test('rejects traversal, symlinks, and unreferenced files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rollback-gate-'));
  await mkdir(join(root, 'backups'));
  const file = join(root, 'backups', 'people.json');
  await writeFile(file, '{"records":[]}');
  await assert.rejects(() => verifyBackupFiles(root, manifest('../people.json'), 'backups'), /backup path escapes root/);
  await writeFile(join(root, 'backups', 'orphan.json'), 'orphan');
  await assert.rejects(() => verifyBackupFiles(root, manifest('backups/people.json'), 'backups'), /unreferenced backup file/);
  await writeFile(join(root, 'backups', 'orphan.json'), 'orphan');
  await symlink(file, join(root, 'backups', 'link.json'));
  await assert.rejects(() => verifyBackupFiles(root, manifest('backups/people.json'), 'backups'), /symlink/);
});
