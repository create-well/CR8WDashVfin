// Fallback validator: bundles NotionMirrorSummary.tsx with esbuild and runs
// the same assertions as NotionMirrorSummary.test.ts, because vitest workers
// cannot start under current machine load. Not a committed artifact.
import { createRequire } from 'module';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const require = createRequire(join(process.cwd(), 'package.json'));
const esbuildDir = require.resolve('vite/package.json').replace(/node_modules\/vite\/package\.json$/, 'node_modules/esbuild');
const { buildSync } = require(join(esbuildDir, 'lib', 'main.js'));

const root = process.cwd();
const out = mkdtempSync(join(tmpdir(), 'cr8w-validate-'));

writeFileSync(join(out, 'vitest-shim.mjs'), `
import { strict as assert } from 'assert';
export const describe = (_name, fn) => fn();
export const it = Object.assign((name, fn) => { try { fn(); console.log('PASS', name); } catch (e) { console.error('FAIL', name); console.error(e.message); process.exitCode = 1; } }, { each: (cases) => (name, fn) => cases.forEach(c => it(name.replace('%s', c[0]), () => fn(...c))) });
export const expect = (actual) => ({
  toBe: (expected) => assert.equal(actual, expected),
  toEqual: (expected) => assert.deepEqual(actual, expected),
  toContain: (expected) => assert.ok(String(actual).includes(expected), \`\${actual} does not contain \${expected}\`),
  toBeNull: () => assert.equal(actual, null),
  toHaveLength: (n) => assert.equal(actual.length, n),
});
`);

buildSync({
  entryPoints: [join(root, 'src/app/components/__tests__/NotionMirrorSummary.test.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: join(out, 'bundle.mjs'),
  logLevel: 'silent',
  alias: { vitest: join(out, 'vitest-shim.mjs') },
});

await import(pathToFileURL(join(out, 'bundle.mjs')).href);
