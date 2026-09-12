export const CALENDAR_SYNC_META_KEY = 'cr8w_calendar_sync_meta';
export const CALENDAR_EVENTS_KEY = 'cr8w_calendar_events';
export const CALENDAR_STALE_AFTER_MS = 24 * 60 * 60 * 1_000;

export type CalendarSyncErrorCode =
  | 'fetch_failed'
  | 'parse_failed'
  | 'storage_failed'
  | 'unknown';

export interface CalendarSyncMetadata {
  lastAttemptAt: string;
  lastSuccessfulSyncAt: string | null;
  lastOutcome: 'ok' | 'error';
  errorCode?: CalendarSyncErrorCode;
}

export interface CalendarSyncState {
  configured: boolean;
  status: 'not_configured' | 'never_synced' | 'ok' | 'error';
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  recordCount: number;
  stale: boolean;
  errorCode?: CalendarSyncErrorCode;
}

const ERROR_CODES = new Set<CalendarSyncErrorCode>([
  'fetch_failed',
  'parse_failed',
  'storage_failed',
  'unknown',
]);

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function normalizeCalendarSyncMetadata(raw: unknown): CalendarSyncMetadata | null {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const metadata = value as Record<string, unknown>;
  if (!validTimestamp(metadata.lastAttemptAt)) return null;
  if (metadata.lastOutcome !== 'ok' && metadata.lastOutcome !== 'error') return null;

  const lastSuccessfulSyncAt = validTimestamp(metadata.lastSuccessfulSyncAt)
    ? metadata.lastSuccessfulSyncAt
    : null;
  if (metadata.lastOutcome === 'ok' && !lastSuccessfulSyncAt) return null;

  const errorCode = ERROR_CODES.has(metadata.errorCode as CalendarSyncErrorCode)
    ? metadata.errorCode as CalendarSyncErrorCode
    : undefined;

  return {
    lastAttemptAt: metadata.lastAttemptAt,
    lastSuccessfulSyncAt,
    lastOutcome: metadata.lastOutcome,
    ...(metadata.lastOutcome === 'error' ? { errorCode: errorCode ?? 'unknown' } : {}),
  };
}

export function deriveCalendarSyncState({
  configured,
  metadata,
  recordCount,
  now = Date.now(),
}: {
  configured: boolean;
  metadata: unknown;
  recordCount: number;
  now?: number;
}): CalendarSyncState {
  const normalized = normalizeCalendarSyncMetadata(metadata);
  const count = Number.isFinite(recordCount) && recordCount >= 0 ? Math.floor(recordCount) : 0;

  if (!configured) {
    return {
      configured: false,
      status: 'not_configured',
      lastAttemptAt: normalized?.lastAttemptAt ?? null,
      lastSuccessfulSyncAt: normalized?.lastSuccessfulSyncAt ?? null,
      recordCount: count,
      stale: false,
    };
  }

  if (!normalized) {
    return {
      configured: true,
      status: 'never_synced',
      lastAttemptAt: null,
      lastSuccessfulSyncAt: null,
      recordCount: count,
      stale: false,
    };
  }

  if (normalized.lastOutcome === 'error') {
    return {
      configured: true,
      status: 'error',
      lastAttemptAt: normalized.lastAttemptAt,
      lastSuccessfulSyncAt: normalized.lastSuccessfulSyncAt,
      recordCount: count,
      stale: false,
      errorCode: normalized.errorCode ?? 'unknown',
    };
  }

  return {
    configured: true,
    status: 'ok',
    lastAttemptAt: normalized.lastAttemptAt,
    lastSuccessfulSyncAt: normalized.lastSuccessfulSyncAt,
    recordCount: count,
    stale: now - Date.parse(normalized.lastSuccessfulSyncAt!) > CALENDAR_STALE_AFTER_MS,
  };
}
