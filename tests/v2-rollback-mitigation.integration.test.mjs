import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  acquireRollbackLock,
  applyAtomicSnapshot,
  safeReadBackupFile,
} from '../scripts/v2-rollback-mitigation.mjs';

class MemoryKvAdapter {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
    this.failOnKey = null;
  }
  async get(key) { return this.values.has(key) ? this.values.get(key) : undefined; }
  async set(key, value) {
    if (key === this.failOnKey) throw new Error(`injected write failure for ${key}`);
    this.values.set(key, value);
  }
  async delete(key) { this.values.delete(key); }
}

test('rejects symlink traversal before reading a backup snapshot', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr8w-mitigation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outside = path.join(root, 'outside.json');
  const backupDir = path.join(root, 'backup');
  await fs.mkdir(backupDir);
  await fs.writeFile(outside, '{"secret":true}');
  await fs.symlink(outside, path.join(backupDir, 'snapshot.json'));

  await assert.rejects(
    safeReadBackupFile(backupDir, 'snapshot.json'),
    /symbolic link|outside backup directory/,
  );
});

test('rejects a concurrent rollback lock and releases it after completion', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr8w-lock-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = await acquireRollbackLock(path.join(root, 'lock'));
  await assert.rejects(
    acquireRollbackLock(path.join(root, 'lock')),
    /Rollback lock is held/,
  );
  await first.release();
  const second = await acquireRollbackLock(path.join(root, 'lock'));
  await second.release();
});

test('commits a multi-key snapshot atomically through the KV adapter', async () => {
  const adapter = new MemoryKvAdapter({ flows: 'old-flows', content: 'old-content', meta: 'old-meta' });
  const result = await applyAtomicSnapshot(adapter, { flows: 'new-flows', content: 'new-content', meta: 'new-meta' }, { keys: ['flows', 'content'], metadataKey: 'meta' });

  assert.equal(result.committed, true);
  assert.equal(await adapter.get('flows'), 'new-flows');
  assert.equal(await adapter.get('content'), 'new-content');
  assert.equal(await adapter.get('meta'), 'new-meta');
});

test('restores all previously written keys when a later key fails', async () => {
  const adapter = new MemoryKvAdapter({ flows: 'old-flows', content: 'old-content', meta: 'old-meta' });
  adapter.failOnKey = 'content';

  await assert.rejects(
    applyAtomicSnapshot(adapter, { flows: 'new-flows', content: 'new-content', meta: 'new-meta' }, { keys: ['flows', 'content'], metadataKey: 'meta' }),
    /Atomic snapshot failed/,
  );
  assert.equal(await adapter.get('flows'), 'old-flows');
  assert.equal(await adapter.get('content'), 'old-content');
  assert.equal(await adapter.get('meta'), 'old-meta');
});

test('deletes an intentionally absent key as part of the atomic bundle', async () => {
  const adapter = new MemoryKvAdapter({ flows: 'old-flows', content: 'old-content', meta: 'old-meta' });

  const result = await applyAtomicSnapshot(
    adapter,
    { flows: 'new-flows', meta: 'new-meta' },
    { keys: ['flows', 'content'], metadataKey: 'meta', absentKeys: ['content'] },
  );

  assert.equal(result.committed, true);
  assert.equal(await adapter.get('flows'), 'new-flows');
  assert.equal(await adapter.get('content'), undefined);
  assert.equal(await adapter.get('meta'), 'new-meta');
});
