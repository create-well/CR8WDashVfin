import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type SnapshotRecord = {
  sourcePageId: string;
  source: string;
  properties: Record<string, unknown>;
  archived?: boolean;
  sourceLastEditedAt?: string | null;
};

export type SourceSnapshot = {
  source: string;
  generationId: string;
  capturedAt: string;
  records: SnapshotRecord[];
};

export type SyncMetadata = {
  source: 'notion';
  syncRunId: string;
  generationId: string;
  mirrorUpdatedAt: string;
  sourceLastEditedAt: string | null;
  counts: Record<string, number>;
};

export type BackupEntry = {
  backupId: string;
  key: string;
  path: string;
  present: boolean;
  byteLength: number;
  sha256: string;
  capturedAt: string;
};

export type BackupManifest = {
  version: 1;
  generationId: string;
  attemptedWriteKeys: string[];
  entries: BackupEntry[];
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function fail(message: string): never { throw new Error(message); }
function nonempty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) fail(`${field} must be a non-empty string`);
}
function iso(value: unknown, field: string): asserts value is string {
  nonempty(value, field);
  if (!ISO.test(value) || Number.isNaN(Date.parse(value))) fail(`${field} must be an ISO UTC timestamp`);
}
function id(value: unknown, field: string): asserts value is string {
  nonempty(value, field);
  if (!ID.test(value)) fail(`${field} has invalid characters`);
}

export function validateSourceSnapshot(value: unknown, expectedGeneration?: string): SourceSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('source snapshot must be an object');
  const item = value as Partial<SourceSnapshot>;
  nonempty(item.source, 'snapshot.source');
  id(item.generationId, 'snapshot.generationId');
  if (expectedGeneration && item.generationId !== expectedGeneration) fail('snapshot generation does not match manifest');
  iso(item.capturedAt, 'snapshot.capturedAt');
  if (!Array.isArray(item.records)) fail('snapshot.records must be an array');
  const seen = new Set<string>();
  for (const record of item.records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) fail('snapshot record must be an object');
    const candidate = record as Partial<SnapshotRecord>;
    nonempty(candidate.sourcePageId, 'record.sourcePageId');
    nonempty(candidate.source, 'record.source');
    if (candidate.source !== item.source) fail('record source does not match snapshot source');
    if (seen.has(candidate.sourcePageId)) fail(`duplicate sourcePageId: ${candidate.sourcePageId}`);
    seen.add(candidate.sourcePageId);
    if (!candidate.properties || typeof candidate.properties !== 'object' || Array.isArray(candidate.properties)) fail('record.properties must be an object');
    if (candidate.sourceLastEditedAt !== undefined && candidate.sourceLastEditedAt !== null) iso(candidate.sourceLastEditedAt, 'record.sourceLastEditedAt');
  }
  return value as SourceSnapshot;
}

export function validateSyncMetadata(value: unknown, expectedGeneration?: string): SyncMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('sync metadata must be an object');
  const item = value as Partial<SyncMetadata>;
  if (item.source !== 'notion') fail('sync metadata.source must be notion');
  id(item.syncRunId, 'sync metadata.syncRunId');
  id(item.generationId, 'sync metadata.generationId');
  if (expectedGeneration && item.generationId !== expectedGeneration) fail('sync metadata generation does not match manifest');
  iso(item.mirrorUpdatedAt, 'sync metadata.mirrorUpdatedAt');
  if (item.sourceLastEditedAt !== null && item.sourceLastEditedAt !== undefined) iso(item.sourceLastEditedAt, 'sync metadata.sourceLastEditedAt');
  if (!item.counts || typeof item.counts !== 'object' || Array.isArray(item.counts)) fail('sync metadata.counts must be an object');
  for (const [source, count] of Object.entries(item.counts)) {
    nonempty(source, 'sync metadata count source');
    if (!Number.isSafeInteger(count) || count < 0) fail(`sync metadata count for ${source} must be a non-negative integer`);
  }
  return value as SyncMetadata;
}

export function validateManifest(value: unknown): BackupManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('backup manifest must be an object');
  const item = value as Partial<BackupManifest>;
  if (item.version !== 1) fail('backup manifest.version must be 1');
  id(item.generationId, 'manifest.generationId');
  if (!Array.isArray(item.attemptedWriteKeys)) fail('manifest.attemptedWriteKeys must be an array');
  if (!Array.isArray(item.entries)) fail('manifest.entries must be an array');
  const attempted = new Set<string>();
  for (const key of item.attemptedWriteKeys) { nonempty(key, 'manifest.attemptedWriteKeys item'); if (attempted.has(key)) fail(`duplicate attempted write key: ${key}`); attempted.add(key); }
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const entry of item.entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('manifest entry must be an object');
    id(entry.backupId, 'entry.backupId');
    nonempty(entry.key, 'entry.key');
    nonempty(entry.path, 'entry.path');
    if (ids.has(entry.backupId)) fail(`duplicate backupId: ${entry.backupId}`);
    if (keys.has(entry.key)) fail(`duplicate manifest key: ${entry.key}`);
    ids.add(entry.backupId); keys.add(entry.key);
    if (!entry.present) fail(`backup entry is not present: ${entry.key}`);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0) fail(`invalid byteLength for ${entry.key}`);
    if (!SHA256.test(entry.sha256)) fail(`invalid sha256 for ${entry.key}`);
    iso(entry.capturedAt, `entry.capturedAt for ${entry.key}`);
  }
  const missing = [...attempted].filter((key) => !keys.has(key));
  if (missing.length) fail(`manifest is missing exact attempted-write keys: ${missing.join(', ')}`);
  const extra = [...keys].filter((key) => !attempted.has(key));
  if (extra.length) fail(`manifest contains unattempted backup keys: ${extra.join(', ')}`);
  return value as BackupManifest;
}

function safePath(root: string, candidate: string): string {
  if (isAbsolute(candidate)) fail(`absolute backup path is not allowed: ${candidate}`);
  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, candidate);
  const rel = relative(resolvedRoot, resolved);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`backup path escapes root: ${candidate}`);
  return resolved;
}

async function rejectSymlinkComponents(root: string, target: string): Promise<void> {
  const resolvedRoot = resolve(root);
  const rel = relative(resolvedRoot, target);
  const components = rel ? rel.split(sep) : [];
  let current = resolvedRoot;
  for (const component of components) {
    current = resolve(current, component);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) fail(`symlink path component is not allowed: ${relative(resolvedRoot, current)}`);
  }
}

async function collectFiles(directory: string, root: string, found: Set<string>): Promise<void> {
  await rejectSymlinkComponents(root, directory);
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`symlink in backup directory: ${relative(root, candidate)}`);
    if (entry.isDirectory()) await collectFiles(candidate, root, found);
    else if (entry.isFile()) found.add(candidate);
    else fail(`unsupported backup directory entry: ${relative(root, candidate)}`);
  }
}

export async function verifyBackupFiles(root: string, manifest: BackupManifest, backupDirectory = '.'): Promise<void> {
  validateManifest(manifest);
  const referenced = new Set<string>();
  for (const entry of manifest.entries) {
    const path = safePath(root, entry.path);
    await rejectSymlinkComponents(root, path);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) fail(`symlink backup file is not allowed: ${entry.path}`);
    if (!stat.isFile()) fail(`backup path is not a regular file: ${entry.path}`);
    const content = await readFile(path);
    if (content.byteLength !== entry.byteLength) fail(`byteLength mismatch for ${entry.key}`);
    const digest = createHash('sha256').update(content).digest('hex');
    if (digest !== entry.sha256) fail(`sha256 mismatch for ${entry.key}`);
    referenced.add(path);
  }
  const dir = safePath(root, backupDirectory);
  const files = new Set<string>();
  await collectFiles(dir, resolve(root), files);
  for (const file of files) if (!referenced.has(file)) fail(`unreferenced backup file: ${relative(resolve(root), file)}`);
}

export function verifySnapshotSet(snapshots: unknown[], metadata: unknown, generationId: string): void {
  id(generationId, 'generationId');
  for (const snapshot of snapshots) validateSourceSnapshot(snapshot, generationId);
  validateSyncMetadata(metadata, generationId);
}
