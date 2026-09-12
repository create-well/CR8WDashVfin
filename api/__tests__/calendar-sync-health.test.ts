import { describe, expect, it } from 'vitest';
import {
  CALENDAR_STALE_AFTER_MS,
  deriveCalendarSyncState,
} from '../calendar-sync-health.js';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');
const success = {
  lastAttemptAt: '2026-09-11T11:00:00.000Z',
  lastSuccessfulSyncAt: '2026-09-11T11:00:00.000Z',
  lastOutcome: 'ok',
};

describe('deriveCalendarSyncState', () => {
  it('reports unconfigured without exposing an operational error', () => {
    expect(deriveCalendarSyncState({ configured: false, metadata: success, recordCount: 4, now: NOW }))
      .toMatchObject({ configured: false, status: 'not_configured', recordCount: 4, stale: false });
  });

  it.each([null, '{}', { lastOutcome: 'ok' }])(
    'treats missing or malformed metadata as never synced',
    (metadata) => {
      expect(deriveCalendarSyncState({ configured: true, metadata, recordCount: 0, now: NOW }))
        .toEqual({
          configured: true,
          status: 'never_synced',
          lastAttemptAt: null,
          lastSuccessfulSyncAt: null,
          recordCount: 0,
          stale: false,
        });
    },
  );

  it('reports a valid empty feed as healthy', () => {
    expect(deriveCalendarSyncState({ configured: true, metadata: success, recordCount: 0, now: NOW }))
      .toMatchObject({ status: 'ok', recordCount: 0, stale: false });
  });

  it('uses the event array count for a healthy mirror', () => {
    expect(deriveCalendarSyncState({ configured: true, metadata: success, recordCount: 7, now: NOW }))
      .toMatchObject({ status: 'ok', recordCount: 7 });
  });

  it('marks successful data stale after 24 hours', () => {
    const timestamp = new Date(NOW - CALENDAR_STALE_AFTER_MS - 1).toISOString();
    const state = deriveCalendarSyncState({
      configured: true,
      metadata: { ...success, lastAttemptAt: timestamp, lastSuccessfulSyncAt: timestamp },
      recordCount: 2,
      now: NOW,
    });
    expect(state).toMatchObject({ status: 'ok', stale: true });
  });

  it('reports bounded failures while preserving last success', () => {
    const state = deriveCalendarSyncState({
      configured: true,
      metadata: {
        lastAttemptAt: '2026-09-11T11:30:00.000Z',
        lastSuccessfulSyncAt: success.lastSuccessfulSyncAt,
        lastOutcome: 'error',
        errorCode: 'fetch_failed',
      },
      recordCount: 3,
      now: NOW,
    });
    expect(state).toMatchObject({
      status: 'error',
      errorCode: 'fetch_failed',
      lastSuccessfulSyncAt: success.lastSuccessfulSyncAt,
      recordCount: 3,
      stale: false,
    });
  });
});
