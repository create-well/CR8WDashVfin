import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  new URL('../.github/workflows/notion-sync.yml', import.meta.url),
  'utf8',
);

test('maps the Production Notion secret to the runtime token', () => {
  assert.match(
    workflow,
    /^\s+NOTION_TOKEN: \$\{\{ secrets\.NOTION_CR8WDASHBOARD_KEY \}\}$/m,
  );
  assert.doesNotMatch(workflow, /\$\{\{ secrets\.NOTION_TOKEN \}\}/);
});
