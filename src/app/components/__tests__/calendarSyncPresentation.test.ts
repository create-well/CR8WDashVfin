import { describe, expect, it } from 'vitest';
import {
  calendarSyncLabel,
  calendarSyncNeedsAttention,
  shouldShowDashboardRetry,
} from '../calendarSyncPresentation';
import type { CalendarSyncState } from '../api';

function state(overrides: Partial<CalendarSyncState> = {}): CalendarSyncState {
  return {
    configured: true,
    status: 'ok',
    lastAttemptAt: '2026-09-11T12:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-11T12:00:00.000Z',
    recordCount: 2,
    stale: false,
    ...overrides,
  };
}

describe('calendar sync presentation', () => {
  it.each([
    [state({ configured: false, status: 'not_configured' }), 'Shared calendar not configured'],
    [state({ status: 'never_synced' }), 'Shared calendar has not synced yet'],
    [state({ status: 'ok', recordCount: 0 }), 'Shared calendar synced; no events'],
    [state({ status: 'ok', stale: true }), 'Shared calendar data is stale'],
    [state({ status: 'error', recordCount: 2 }), 'Shared calendar refresh failed; showing last good data'],
  ])('returns the designed connector label', (calendarState, label) => {
    expect(calendarSyncLabel(calendarState)).toBe(label);
  });

  it('keeps only healthy, current data quiet', () => {
    expect(calendarSyncNeedsAttention(state())).toBe(false);
    expect(calendarSyncNeedsAttention(state({ stale: true }))).toBe(true);
    expect(calendarSyncNeedsAttention(state({ status: 'error' }))).toBe(true);
  });

  it('does not repurpose dashboard Retry for a calendar-only warning', () => {
    expect(shouldShowDashboardRetry('fresh', false, false)).toBe(false);
    expect(shouldShowDashboardRetry('failed', false, false)).toBe(true);
    expect(shouldShowDashboardRetry('fresh', true, false)).toBe(true);
    expect(shouldShowDashboardRetry('fresh', false, true)).toBe(true);
  });
});
