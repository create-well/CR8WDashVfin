#!/usr/bin/env node
import { randomUUID } from 'node:crypto';

const CONTRACT_VERSION = '1.0.0';
const DEFAULT_NOTION_API_URL = 'https://api.notion.com/v1';
const DEFAULT_NOTION_API_VERSION = '2022-06-28';
const SOURCE_DEFINITIONS = [
  { name: 'projects', id: 'bf924acf-799d-82ae-be91-07cbd38ffeae' },
  { name: 'clients', id: '57224acf-799d-8231-8b20-8798657e2d79' },
  { name: 'tasks', id: '10a24acf-799d-830f-95d5-8747f7ab2531' },
  { name: 'photos_media', id: '7c824acf-799d-8338-9e2e-87decd0369d3' },
  { name: 'notes', id: '37024acf-799d-82a2-8635-870171412004' },
];

function parseArgs(argv) {
  let dryRun = true;
  let sourceName = null;
  let limit = 100;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--write') {
      dryRun = false;
      continue;
    }
    if (arg === '--source' || arg === '--limit') {
      const next = argv[index + 1];
      if (!next) throw new Error(`${arg} requires a value`);
      if (arg === '--source') sourceName = next;
      if (arg === '--limit') limit = parseLimit(next);
      index += 1;
      continue;
    }
    if (arg.startsWith('--source=')) {
      sourceName = arg.slice('--source='.length);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  return { dryRun, sourceName, limit };
}

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`--limit must be a positive integer, received: ${value}`);
  }
  return parsed;
}

function selectSources(sourceName) {
  if (!sourceName) return SOURCE_DEFINITIONS;
  const source = SOURCE_DEFINITIONS.find((candidate) => candidate.name === sourceName);
  if (!source) throw new Error(`Unsupported source: ${sourceName}`);
  return [source];
}

async function querySource(baseUrl, apiKey, notionVersion, source, limit) {
  const response = await fetch(`${baseUrl}/data_sources/${source.id}/query`, {
    method: 'POST',
    headers: {
      authorization: ['Bearer', apiKey].join(' '),
      'content-type': 'application/json',
      'notion-version': notionVersion,
    },
    body: JSON.stringify({ page_size: limit }),
  });

  if (!response.ok) {
    throw new Error(`Notion query failed for ${source.name}: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results.slice(0, limit) : [];
  return {
    name: source.name,
    fetched: results.length,
    planned: results.length,
    cursor: payload.next_cursor ?? null,
    dead_letters: 0,
  };
}

async function main() {
  const { dryRun, sourceName, limit } = parseArgs(process.argv.slice(2));
  if (!dryRun) {
    throw new Error('Write mode is not enabled for this worker. Re-run with --dry-run.');
  }

  const apiKey = process.env.NOTION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('NOTION_API_KEY must be set for the Notion sync worker.');
  }

  const baseUrl = (process.env.NOTION_API_URL?.trim() || DEFAULT_NOTION_API_URL).replace(/\/$/, '');
  const notionVersion = process.env.NOTION_API_VERSION?.trim() || DEFAULT_NOTION_API_VERSION;
  const sources = selectSources(sourceName);
  const sourceResults = [];

  for (const source of sources) {
    sourceResults.push(await querySource(baseUrl, apiKey, notionVersion, source, limit));
  }

  const totalPlanned = sourceResults.reduce((sum, source) => sum + source.planned, 0);
  const totalDeadLetters = sourceResults.reduce((sum, source) => sum + source.dead_letters, 0);
  const summary = {
    run_id: randomUUID(),
    mode: 'dry-run',
    contract_version: CONTRACT_VERSION,
    total_planned: totalPlanned,
    total_dead_letters: totalDeadLetters,
    sources: sourceResults,
  };

  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
