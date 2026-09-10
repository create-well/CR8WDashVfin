#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const REQUIRED = [
  { name: 'SUPABASE_URL', kind: 'url', description: 'Supabase project URL' },
  { name: 'SUPABASE_PUBLISHABLE_KEY', alternatives: ['SUPABASE_ANON_KEY'], kind: 'key', description: 'Supabase browser/API publishable key' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', alternatives: ['SUPABASE_SECRET_KEY'], kind: 'key', description: 'Supabase server-side service key' },
  { name: 'NOTION_API_KEY', kind: 'secret', description: 'Notion API token' },
  { name: 'NOTION_SYNC_OPERATOR_TOKEN', kind: 'secret', description: 'Protected manual sync token' },
  { name: 'CRON_SECRET', kind: 'secret', description: 'Vercel Cron authorization token' },
];

function parseEnvFile(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function loadValues() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--config-file='))?.slice('--config-file='.length);
  if (fileArg) {
    if (!fs.existsSync(fileArg)) throw new Error(`Environment file not found: ${fileArg}`);
    return { values: parseEnvFile(fileArg), source: fileArg };
  }
  return { values: process.env, source: 'process environment' };
}

function isValid(item, value) {
  if (!value || !value.trim()) return 'missing or empty';
  if (item.kind === 'url') {
    try { new URL(value); } catch { return 'must be a valid URL'; }
  }
  if (item.kind === 'key' && value.length < 20) return 'looks too short';
  if (item.kind === 'secret' && value.length < 16) return 'looks too short';
  if (/^(your[-_ ]|replace[-_ ]|changeme|example)/i.test(value)) return 'placeholder value';
  return null;
}

let loaded;
try { loaded = loadValues(); } catch (error) {
  console.error(`FAIL configuration: ${error.message}`);
  process.exit(2);
}

const results = [];
for (const item of REQUIRED) {
  const names = [item.name, ...(item.alternatives ?? [])];
  const selected = names.find((name) => loaded.values[name]?.trim());
  const value = selected ? loaded.values[selected] : '';
  const problem = isValid(item, value);
  results.push({ name: item.name, alternatives: item.alternatives ?? [], selected, status: problem ? 'FAIL' : 'PASS', reason: problem ?? 'configured', description: item.description });
}

const invalidAlternatives = results.filter((result) => result.status === 'FAIL');
const output = {
  ok: invalidAlternatives.length === 0,
  source: loaded.source,
  environment: loaded.values.VERCEL_ENV ?? loaded.values.NODE_ENV ?? 'unspecified',
  checks: results.map(({ name, alternatives, selected, status, reason, description }) => ({ name, alternatives, selected: selected ?? null, status, reason, description })),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(output, null, 2));
else {
  console.log(`Environment validation: ${output.ok ? 'PASS' : 'FAIL'} (${output.source})`);
  for (const result of results) console.log(`${result.status} ${result.name}${result.alternatives.length ? ` (or ${result.alternatives.join(', ')})` : ''}: ${result.reason}`);
}
process.exit(output.ok ? 0 : 1);
