#!/usr/bin/env node
import { verifyProductionBackup } from './runner.ts';

function usage(): string {
  return 'Usage: node --experimental-strip-types tools/rollback-gate/cli.ts --root <backup-root> [--manifest <manifest.json>] [--backup-directory <relative-dir>] [--json]';
}
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(usage()); process.exit(0); }
try {
  const root = option(args, '--root');
  if (!root) throw new Error(`--root is required\n${usage()}`);
  const result = await verifyProductionBackup({ root, manifestPath: option(args, '--manifest'), backupDirectory: option(args, '--backup-directory') });
  if (args.includes('--json')) console.log(JSON.stringify(result));
  else console.log(`PASS: verified ${result.verifiedFiles} files and ${result.verifiedSnapshots} snapshots for ${result.generationId}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (args.includes('--json')) console.error(JSON.stringify({ ok: false, error: message }));
  else console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}
