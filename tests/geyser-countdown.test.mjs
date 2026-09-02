import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeyserCountdown } from '../src/app/components/geyserCountdown.js';

test('future target returns remaining-day countdown copy', () => {
  const result = getGeyserCountdown('2026-04-15', '2026-04-10');

  assert.equal(result.count, 5);
  assert.equal(result.compactLabel, 'days til we go live');
  assert.equal(result.detailLabel, 'days until');
  assert.equal(result.targetLabel, 'April 15, 2026');
});

test('past target returns elapsed-day countdown copy', () => {
  const result = getGeyserCountdown('2026-04-15', '2026-09-02');

  assert.equal(result.count, 140);
  assert.ok(result.count > 0);
  assert.equal(result.compactLabel, 'days since we went live');
  assert.equal(result.detailLabel, 'days since');
  assert.equal(result.targetLabel, 'April 15, 2026');
});

test('target today returns cycle-complete copy with zero days', () => {
  const result = getGeyserCountdown('2026-04-15', '2026-04-15');

  assert.equal(result.count, 0);
  assert.equal(result.compactLabel, 'cycle complete');
  assert.equal(result.detailLabel, 'cycle complete');
  assert.equal(result.targetLabel, 'April 15, 2026');
});

test('regression guard never returns a negative count for far-past targets', () => {
  const result = getGeyserCountdown('2020-01-01', '2026-09-02');

  assert.ok(result.count >= 0);
  assert.equal(result.compactLabel, 'days since we went live');
});
