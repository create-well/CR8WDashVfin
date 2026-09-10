#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireRollbackLock } from './v2-rollback-mitigation.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifier = path.join(projectRoot, 'scripts', 'verify-v2-rollback-backup.mjs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!['--manifest', '--backup-dir', '--lock-dir'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
    const value = argv[++i];
    if (!value) throw new Error(`${arg} requires a value`);
    args[arg.slice(2).replace('-', '_')] = value;
  }
  if (!args.manifest || !args.backup_dir) throw new Error('--manifest and --backup-dir are required');
  return args;
}

function runVerifier(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [verifier, '--manifest', args.manifest, '--backup-dir', args.backup_dir, '--json'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

try {
  const args = parseArgs(process.argv.slice(2));
  const lockDir = args.lock_dir ?? path.join(args.backup_dir, '.rollback-operator.lock');
  const lock = await acquireRollbackLock(lockDir);
  try {
    const result = await runVerifier(args);
    process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.code !== 0) {
      console.error('Rollback operator guard stopped: backup verification failed. No restore action was attempted.');
      process.exitCode = 1;
    } else {
      console.error('Rollback operator guard passed. Review the JSON result and obtain the required change approval before restoring any Supabase keys.');
    }
  } finally {
    await lock.release();
  }
} catch (error) {
  console.error(`Rollback operator guard error: ${error.message}`);
  process.exitCode = 2;
}
