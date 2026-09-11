import type { CalendarSyncState } from './api';

export function calendarSyncNeedsAttention(state: CalendarSyncState): boolean {
  return state.status !== 'ok' || state.stale;
}

export function shouldShowDashboardRetry(
  syncStatus: 'loading' | 'fresh' | 'stale' | 'failed',
  mirrorIsStale: boolean,
  partialSourceFailure: boolean,
): boolean {
  return syncStatus === 'failed' || syncStatus === 'stale' || mirrorIsStale || partialSourceFailure;
}

export function calendarSyncLabel(state: CalendarSyncState): string {
  if (state.status === 'not_configured') return 'Shared calendar not configured';
  if (state.status === 'never_synced') return 'Shared calendar has not synced yet';
  if (state.status === 'error') {
    return state.recordCount > 0
      ? 'Shared calendar refresh failed; showing last good data'
      : 'Shared calendar refresh failed';
  }
  if (state.stale) return 'Shared calendar data is stale';
  if (state.recordCount === 0) return 'Shared calendar synced; no events';
  return `Shared calendar synced; ${state.recordCount} event${state.recordCount === 1 ? '' : 's'}`;
}
