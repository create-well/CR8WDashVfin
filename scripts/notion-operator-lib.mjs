// Shared helpers for CR8W Notion operator scripts (run-notion-sync.mjs,
// audit-notion-sources.mjs). Not executable on its own.
//
// - loadLocalEnv(): fills process.env from .env.local if present, without
//   overriding variables that are already set (real environment wins).
// - resolveEsbuild(): finds the esbuild binary across hoisted and pnpm-store
//   node_modules layouts. esbuild is a transitive dev dependency (via vitest),
//   so it is resolved dynamically instead of being declared.
// - bundleTs(entrySource, outfile): bundles a TS entry to a temp ESM file and
//   returns the bundle path. Caller is responsible for cleanup.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadLocalEnv() {
  const envFile = path.join(REPO_ROOT, '.env.local');
  if (!existsSync(envFile)) return false;
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, name, raw] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = raw.replace(/^["']|["']$/g, '');
  }
  return true;
}

export function resolveEsbuild() {
  const candidates = [
    path.join(REPO_ROOT, 'node_modules', '.bin', 'esbuild'),
    ...globPnpmEsbuild().map((pkgDir) => path.join(pkgDir, 'bin', 'esbuild')),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      'esbuild binary not found. Run `pnpm install` first. '
      + 'Tried: ' + candidates.join(', ')
    );
  }
  return found;
}

function globPnpmEsbuild() {
  const pnpmDir = path.join(REPO_ROOT, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) return [];
  return readdirSync(pnpmDir)
    .filter((entry) => /^esbuild@\d+\.\d+\.\d+$/.test(entry))
    .sort().reverse()
    .map((entry) => path.join(pnpmDir, entry, 'node_modules', 'esbuild'));
}

export function bundleTs(entrySource, outfile) {
  const entryFile = outfile.replace(/\.cjs$/, '.entry.mjs');
  writeFileSync(entryFile, entrySource);
  const esbuild = resolveEsbuild();
  try {
    // CJS output: bundled CJS dependencies (e.g. @supabase/node-fetch) call
    // require('stream') etc., which the ESM shim cannot satisfy.
    execFileSync(esbuild, [entryFile, '--bundle', '--platform=node', '--format=cjs', '--log-level=warning', '--outfile=' + outfile], { stdio: ['ignore', 'ignore', 'inherit'] });
  } finally {
    rmSync(entryFile, { force: true });
  }
  return outfile;
}
