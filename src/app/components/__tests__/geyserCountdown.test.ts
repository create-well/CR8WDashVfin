import { describe, expect, it } from 'vitest';
import { GEYSER_COUNTDOWN_TARGET, getGeyserCountdown } from '../geyserCountdown';

const ref = (iso: string) => new Date(iso);

describe('getGeyserCountdown', () => {
  it('counts down to a future target with pre-launch copy', () => {
    const c = getGeyserCountdown('2026-04-15T00:00:00', ref('2026-04-10T12:00:00'));
    expect(c.hasLaunched).toBe(false);
    expect(c.daysToLaunch).toBeGreaterThan(0);
    expect(c.display).not.toMatch(/^\+/);
    expect(c.label).toBe('days til we go live');
  });

  it('never renders a negative count after the target passes', () => {
    const c = getGeyserCountdown('2026-04-15T00:00:00', ref('2026-09-02T12:00:00'));
    expect(c.hasLaunched).toBe(true);
    expect(c.display).toMatch(/^\+/);
    expect(Number(c.display.slice(1))).toBeGreaterThanOrEqual(0);
    expect(c.label).toBe('days since launch');
  });

  it('treats the launch day itself as not yet launched (zero countdown)', () => {
    const c = getGeyserCountdown('2026-04-15T00:00:00', ref('2026-04-15T00:00:00'));
    expect(c.daysToLaunch).toBe(0);
    expect(c.hasLaunched).toBe(false);
    expect(c.display).toBe('0');
    expect(c.label).toBe('days til we go live');
  });

  it('regression: far-past target yields a non-negative elapsed count', () => {
    const c = getGeyserCountdown('2020-01-01T00:00:00', ref('2026-09-02T12:00:00'));
    expect(c.hasLaunched).toBe(true);
    expect(c.daysToLaunch).toBeLessThan(0);
    expect(Number(c.display.slice(1))).toBeGreaterThanOrEqual(0);
  });

  it('defaults to the centralized cycle target', () => {
    expect(GEYSER_COUNTDOWN_TARGET).toBe('2026-04-15T00:00:00');
  });
});
