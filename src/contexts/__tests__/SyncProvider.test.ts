import { describe, expect, it } from 'vitest';
import { computeSyncStatus, nextPollInterval } from '../SyncProvider';

describe('SyncProvider freshness and polling policy', () => {
  const now = Date.parse('2026-09-10T15:00:00.000Z');

  it('preserves loading and failed states', () => {
    expect(computeSyncStatus('loading', null, now)).toBe('loading');
    expect(computeSyncStatus('failed', new Date(now - 60_000), now)).toBe('failed');
  });

  it('marks a successful sync stale only after the threshold', () => {
    expect(computeSyncStatus('fresh', new Date(now - 4 * 60_000), now)).toBe('fresh');
    expect(computeSyncStatus('fresh', new Date(now - 5 * 60_000 - 1), now)).toBe('stale');
    expect(computeSyncStatus('fresh', null, now)).toBe('fresh');
  });

  it('resets polling to the visible-tab baseline after success', () => {
    expect(nextPollInterval(120_000, 0)).toBe(15_000);
  });

  it('backs off failed polling attempts and caps at five minutes', () => {
    expect(nextPollInterval(15_000, 1)).toBe(30_000);
    expect(nextPollInterval(120_000, 1)).toBe(240_000);
    expect(nextPollInterval(240_000, 1)).toBe(300_000);
    expect(nextPollInterval(300_000, 3)).toBe(300_000);
  });
});
