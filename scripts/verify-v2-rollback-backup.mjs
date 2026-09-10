#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_KEYS = [
  'cr8w_notion_mirror_flows',
  'cr8w_notion_mirror_content',
  'cr8w_notion_sync_meta',
];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_KEY_PATTERN = /^cr8w_notion_mirror_(people|flows|moves|content|money)$/;

function isIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validateSourceSnapshot(value, key) {
  const errors = [];
  if (!Array.isArray(value)) return [`${key}: source snapshot must be a JSON array`];
  const source = key.replace('cr8w_notion_mirror_', '');
  for (const [index, record] of value.entries()) {
    const path = `${key}[${index}]`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`${path}: record must be an object`);
      continue;
    }
    if (typeof record.sourcePageId !== 'string' || !record.sourcePageId) errors.push(`${path}.sourcePageId: must be a non-empty string`);
    if (record.source !== source) errors.push(`${path}.source: expected ${source}`);
    if (!record.properties || typeof record.properties !== 'object' || Array.isArray(record.properties)) errors.push(`${path}.properties: must be an object`);
    if (record.recordSchemaVersion !== undefined && ![1, 2].includes(record.recordSchemaVersion)) errors.push(`${path}.recordSchemaVersion: must be 1 or 2 when present`);
    if (record.sourceLastEditedAt !== null && record.sourceLastEditedAt !== undefined && !isIsoDate(record.sourceLastEditedAt)) errors.push(`${path}.sourceLastEditedAt: must be an ISO date or null`);
    if (record.sourceUrl !== null && record.sourceUrl !== undefined && typeof record.sourceUrl !== 'string') errors.push(`${path}.sourceUrl: must be a string or null`);
    if (typeof record.archived !== 'boolean') errors.push(`${path}.archived: must be boolean`);
  }
  return errors;
}

function validateSyncMetadata(value, key) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${key}: sync metadata must be an object`];
  if (value.source !== 'notion') errors.push(`${key}.source: must be "notion"`);
  if (!isIsoDate(value.mirrorUpdatedAt)) errors.push(`${key}.mirrorUpdatedAt: must be an ISO date`);
  if (value.sourceLastEditedAt !== null && !isIsoDate(value.sourceLastEditedAt)) errors.push(`${key}.sourceLastEditedAt: must be an ISO date or null`);
  if (typeof value.syncRunId !== 'string' || !value.syncRunId) errors.push(`${key}.syncRunId: must be a non-empty string`);
  if (!value.counts || typeof value.counts !== 'object' || Array.isArray(value.counts)) errors.push(`${key}.counts: must be an object`);
  else for (const [source, count] of Object.entries(value.counts)) {
    if (!SOURCE_KEY_PATTERN.test(`cr8w_notion_mirror_${source}`)) errors.push(`${key}.counts.${source}: unknown source`);
    if (!Number.isInteger(count) || count < 0) errors.push(`${key}.counts.${source}: must be a non-negative integer`);
  }
  if (value.recordSchemaVersion !== undefined && ![1, 2].includes(value.recordSchemaVersion)) errors.push(`${key}.recordSchemaVersion: must be 1 or 2 when present`);
  if (value.typedSources !== undefined && (!Array.isArray(value.typedSources) || value.typedSources.some((source) => typeof source !== 'string'))) errors.push(`${key}.typedSources: must be an array of source strings`);
  return errors;
}

function usage() {
  console.error(`Usage: node scripts/verify-v2-rollback-backup.mjs --manifest <path> --backup-dir <path> [--json]

The manifest must contain a keys array with entries shaped as:
  { "key": "...", "present": true, "file": "...", "byteLength": 123, "sha256": "..." }

For an intentionally absent key, use { "key": "...", "present": false } and do not create its file.`);
}

function parseArgs(argv) {
  const args = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--manifest' || arg === '--backup-dir') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      args[arg.slice(2).replace('-', '_')] = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.manifest || !args.backup_dir) throw new Error('--manifest and --backup-dir are required');
  return args;
}

function fail(message, details = {}) {
  return { ok: false, message, ...details };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function main(argv) {
  const args = parseArgs(argv);
  const manifestPath = path.resolve(args.manifest);
  const backupDir = path.resolve(args.backup_dir);
  const manifest = await readJson(manifestPath);

  if (typeof manifest.backupId !== 'string' || !manifest.backupId || !isIsoDate(manifest.capturedAt) || !Array.isArray(manifest.keys)) {
    return fail('Manifest must include backupId, capturedAt, and keys[]');
  }
  if (manifest.keys.length === 0) return fail('Manifest keys[] must not be empty');

  const entries = new Map();
  for (const entry of manifest.keys) {
    if (!entry || typeof entry.key !== 'string' || !entry.key) return fail('Every manifest key entry needs a non-empty key');
    if (entries.has(entry.key)) return fail(`Duplicate manifest key: ${entry.key}`);
    entries.set(entry.key, entry);
  }
  for (const key of DEFAULT_KEYS) {
    if (!entries.has(key)) return fail(`Required rollback key is missing from manifest: ${key}`);
  }

  const errors = [];
  const verified = [];
  for (const [key, entry] of entries) {
    if (typeof entry.present !== 'boolean') {
      errors.push(`${key}: present must be boolean`);
      continue;
    }
    const present = entry.present;
    if (!present) {
      if (entry.file) {
        const declaredPath = path.resolve(backupDir, entry.file);
        if (!declaredPath.startsWith(`${backupDir}${path.sep}`)) errors.push(`${key}: absent entry file escapes backup directory`);
        else {
          try {
            await fs.access(declaredPath);
            errors.push(`${key}: manifest says absent but backup file exists`);
          } catch (error) {
            if (error.code !== 'ENOENT') errors.push(`${key}: could not verify absent file: ${error.message}`);
          }
        }
      }
      verified.push({ key, present: false });
      continue;
    }

    if (typeof entry.file !== 'string' || !entry.file) {
      errors.push(`${key}: present entry must include file`);
      continue;
    }
    if (!Number.isInteger(entry.byteLength) || entry.byteLength < 0) {
      errors.push(`${key}: byteLength must be a non-negative integer`);
    }
    if (typeof entry.sha256 !== 'string' || !SHA256_PATTERN.test(entry.sha256)) {
      errors.push(`${key}: sha256 must be a 64-character lowercase hex string`);
    }
    const filePath = path.resolve(backupDir, entry.file);
    if (!filePath.startsWith(`${backupDir}${path.sep}`)) {
      errors.push(`${key}: backup file escapes backup directory`);
      continue;
    }
    let bytes;
    try {
      bytes = await fs.readFile(filePath);
    } catch (error) {
      errors.push(`${key}: backup file cannot be read: ${error.message}`);
      continue;
    }
    const byteLength = bytes.byteLength;
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (entry.byteLength !== byteLength) errors.push(`${key}: byteLength mismatch (manifest ${entry.byteLength}, actual ${byteLength})`);
    if (entry.sha256 !== sha256) errors.push(`${key}: sha256 mismatch`);
    try {
      const parsed = JSON.parse(bytes.toString('utf8'));
      if (SOURCE_KEY_PATTERN.test(key)) errors.push(...validateSourceSnapshot(parsed, key));
      if (key === 'cr8w_notion_sync_meta') errors.push(...validateSyncMetadata(parsed, key));
    } catch (error) {
      errors.push(`${key}: backup file is not valid JSON: ${error.message}`);
    }
    verified.push({ key, present: true, byteLength, sha256 });
  }

  const result = {
    ok: errors.length === 0,
    backupId: manifest.backupId,
    capturedAt: manifest.capturedAt,
    manifest: manifestPath,
    backupDir,
    verified,
    errorCount: errors.length,
    errors,
  };
  return result;
}

try {
  const result = await main(process.argv.slice(2));
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`Rollback backup verified: ${result.verified.length} manifest keys checked; absent keys preserved.`);
  else {
    console.error(`Rollback backup verification failed: ${result.errorCount} error(s)`);
    for (const error of result.errors ?? [result.message]) console.error(`- ${error}`);
  }
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  usage();
  console.error(`Error: ${error.message}`);
  process.exitCode = 2;
}
