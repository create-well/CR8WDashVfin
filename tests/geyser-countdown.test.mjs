import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const geyserView = await readFile(new URL('../src/app/components/GeyserView.tsx', import.meta.url), 'utf8');

test('centralizes the Geyser countdown target and avoids negative day copy', () => {
  assert.match(geyserView, /export const GEYSER_COUNTDOWN_TARGET = '2026-04-15'/);
  assert.match(geyserView, /Update this for each new Geyser cycle/);
  assert.match(geyserView, /function getGeyserCountdown\(targetDate = GEYSER_COUNTDOWN_TARGET\)/);
  assert.match(geyserView, /compactLabel: elapsedDays === 0 \? 'cycle complete' : 'days since we went live'/);
  assert.match(geyserView, /days since/);
  assert.doesNotMatch(geyserView, /getDaysToLaunch/);
});
