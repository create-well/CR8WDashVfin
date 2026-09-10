#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_KEYS = [
  'cr8w_notion_mirror_flows',
  'cr8w_notion_mirror_content',
  'cr8w_notion_sync_meta',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireRollbackLock(lockDir, {
  owner = `rollback-${process.pid}-${crypto.randomUUID()}`,
  staleAfterMs = 15 * 60 * 1000,
  waitMs = 0,
} = {}) {
  const resolvedLockDir = path.resolve(lockDir);
  const metadataPath = path.join(resolvedLockDir, 'owner.json');
  const startedAt = Date.now();
  await fs.mkdir(path.dirname(resolvedLockDir), { recursive: true });

  while (true) {
    try {
      await fs.mkdir(resolvedLockDir);
      await fs.writeFile(metadataPath, JSON.stringify({ owner, pid: process.pid, acquiredAt: new Date().toISOString() }), { mode: 0o600 });
      let released = false;
      return {
        owner,
        lockDir: resolvedLockDir,
        async release() {
          if (released) return;
          released = true;
          await fs.rm(resolvedLockDir, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let stale = false;
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        const acquiredAt = Date.parse(metadata.acquiredAt);
        stale = !Number.isFinite(acquiredAt) || Date.now() - acquiredAt > staleAfterMs;
      } catch {
        stale = true;
      }
      if (stale) {
        await fs.rm(resolvedLockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() - startedAt >= waitMs) throw new Error(`Rollback lock is held: ${resolvedLockDir}`);
      await sleep(Math.min(100, Math.max(1, waitMs - (Date.now() - startedAt))));
    }
  }
}

export async function safeReadBackupFile(backupDir, relativeFile) {
  if (typeof relativeFile !== 'string' || !relativeFile) throw new Error('Backup file path must be a non-empty string');
  const resolvedBackupDir = await fs.realpath(path.resolve(backupDir));
  const candidate = path.resolve(resolvedBackupDir, relativeFile);
  if (!candidate.startsWith(`${resolvedBackupDir}${path.sep}`)) throw new Error('Backup file escapes backup directory');
  const stat = await fs.lstat(candidate);
  if (stat.isSymbolicLink()) throw new Error('Backup file must not be a symbolic link');
  const realFile = await fs.realpath(candidate);
  if (!realFile.startsWith(`${resolvedBackupDir}${path.sep}`)) throw new Error('Backup file resolves outside backup directory');
  return fs.readFile(realFile);
}

export async function applyAtomicSnapshot(adapter, snapshot, {
  keys = Object.keys(snapshot),
  metadataKey = 'cr8w_notion_sync_meta',
  absentKeys = [],
} = {}) {
  const orderedKeys = [...new Set(keys)];
  if (!orderedKeys.includes(metadataKey)) orderedKeys.push(metadataKey);
  const absent = new Set(absentKeys);
  const original = new Map();
  for (const key of orderedKeys) original.set(key, await adapter.get(key));
  const staged = orderedKeys.map((key) => ({ key, value: snapshot[key], absent: absent.has(key) }));
  const written = [];
  try {
    for (const entry of staged) {
      if (entry.absent) await adapter.delete(entry.key);
      else await adapter.set(entry.key, entry.value);
      written.push(entry.key);
    }
    return { committed: true, keys: orderedKeys };
  } catch (error) {
    const rollbackErrors = [];
    for (const key of written.reverse()) {
      try {
        const prior = original.get(key);
        if (prior === undefined) await adapter.delete(key);
        else await adapter.set(key, prior);
      } catch (rollbackError) {
        rollbackErrors.push({ key, message: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) });
      }
    }
    const detail = rollbackErrors.length ? `; rollback errors: ${JSON.stringify(rollbackErrors)}` : '';
    throw new Error(`Atomic snapshot failed at ${written.length + 1}/${staged.length}${detail}`, { cause: error });
  }
}

export async function verifyWithRollbackLock({ verifier, manifest, backupDir, lockDir }) {
  const lock = await acquireRollbackLock(lockDir ?? path.join(backupDir, '.rollback-verification.lock'));
  try {
    return await verifier({ manifest, backupDir, safeReadBackupFile });
  } finally {
    await lock.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error('This module is intended to be called by the rollback verifier or an authorized restore operator.');
  process.exitCode = 2;
}
