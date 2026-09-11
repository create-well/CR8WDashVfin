import {
  CALENDAR_EVENTS_KEY,
  CALENDAR_SYNC_META_KEY,
  type CalendarSyncErrorCode,
  type CalendarSyncMetadata,
} from './calendar-sync-health.js';

export interface CalendarMirrorEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
  creator: string;
  synced_at: string;
}

export class CalendarSyncError extends Error {
  constructor(
    public readonly code: CalendarSyncErrorCode,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'CalendarSyncError';
  }
}

function parseICalDate(value: string): string {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`;
  }
  const clean = value.replace(/Z$/, '+00:00');
  const iso = clean.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6',
  );
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function unescapeICalText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

export function parseCalendarIcal(text: string, syncedAt: string): CalendarMirrorEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  if (!/BEGIN:VCALENDAR(?:\r?\n|$)/.test(unfolded) || !/(?:^|\r?\n)END:VCALENDAR/.test(unfolded)) {
    throw new CalendarSyncError('parse_failed', 502, 'Calendar feed is not a valid VCALENDAR');
  }

  const events: CalendarMirrorEvent[] = [];
  const veventRe = /BEGIN:VEVENT(?:\r?\n)([\s\S]*?)(?:\r?\n)END:VEVENT/g;
  let match: RegExpExecArray | null;
  while ((match = veventRe.exec(unfolded)) !== null) {
    const block = match[1];
    const property = (name: string) => {
      const value = block.match(new RegExp(`(?:^|\\r?\\n)${name}[^:\\r\\n]*:([^\\r\\n]*)`))?.[1] ?? '';
      return unescapeICalText(value);
    };
    const start = property('DTSTART');
    events.push({
      id: property('UID') || `ical-${events.length}-${syncedAt}`,
      title: property('SUMMARY') || '(No title)',
      start: parseICalDate(start),
      end: parseICalDate(property('DTEND')),
      location: property('LOCATION'),
      description: property('DESCRIPTION'),
      creator: '',
      synced_at: syncedAt,
    });
  }

  return events;
}

export interface CalendarSyncDependencies {
  fetchCalendar: (url: string) => Promise<Response>;
  readValue: (key: string) => Promise<unknown>;
  writeValue: (key: string, value: unknown) => Promise<void>;
  now?: () => Date;
}

async function recordFailure(
  dependencies: CalendarSyncDependencies,
  metadata: CalendarSyncMetadata,
): Promise<void> {
  try {
    await dependencies.writeValue(CALENDAR_SYNC_META_KEY, JSON.stringify(metadata));
  } catch {
    // The original failure remains authoritative when operational metadata cannot be stored.
  }
}

export async function syncCalendarIcal(
  icalUrl: string | undefined,
  dependencies: CalendarSyncDependencies,
): Promise<{ events: CalendarMirrorEvent[]; metadata: CalendarSyncMetadata }> {
  const attemptedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  let lastSuccessfulSyncAt: string | null = null;
  try {
    const previous = await dependencies.readValue(CALENDAR_SYNC_META_KEY);
    if (typeof previous === 'string') {
      const parsed = JSON.parse(previous);
      if (typeof parsed?.lastSuccessfulSyncAt === 'string') {
        lastSuccessfulSyncAt = parsed.lastSuccessfulSyncAt;
      }
    } else if (previous && typeof previous === 'object') {
      const timestamp = (previous as Record<string, unknown>).lastSuccessfulSyncAt;
      if (typeof timestamp === 'string') lastSuccessfulSyncAt = timestamp;
    }
  } catch {
    // Missing or malformed prior metadata must not block a new synchronization.
  }

  if (!icalUrl) {
    await recordFailure(dependencies, {
      lastAttemptAt: attemptedAt,
      lastSuccessfulSyncAt,
      lastOutcome: 'error',
      errorCode: 'unknown',
    });
    throw new CalendarSyncError('unknown', 503, 'Shared calendar is not configured');
  }

  let response: Response;
  try {
    response = await dependencies.fetchCalendar(icalUrl);
    if (!response.ok) throw new Error(`upstream status ${response.status}`);
  } catch {
    await recordFailure(dependencies, {
      lastAttemptAt: attemptedAt,
      lastSuccessfulSyncAt,
      lastOutcome: 'error',
      errorCode: 'fetch_failed',
    });
    throw new CalendarSyncError('fetch_failed', 502, 'Shared calendar fetch failed');
  }

  let events: CalendarMirrorEvent[];
  try {
    events = parseCalendarIcal(await response.text(), attemptedAt);
  } catch (error) {
    const code = error instanceof CalendarSyncError ? error.code : 'parse_failed';
    await recordFailure(dependencies, {
      lastAttemptAt: attemptedAt,
      lastSuccessfulSyncAt,
      lastOutcome: 'error',
      errorCode: code,
    });
    throw new CalendarSyncError(code, 502, 'Shared calendar parse failed');
  }

  const successMetadata: CalendarSyncMetadata = {
    lastAttemptAt: attemptedAt,
    lastSuccessfulSyncAt: attemptedAt,
    lastOutcome: 'ok',
  };
  try {
    await dependencies.writeValue(CALENDAR_EVENTS_KEY, JSON.stringify(events));
    await dependencies.writeValue(CALENDAR_SYNC_META_KEY, JSON.stringify(successMetadata));
  } catch {
    await recordFailure(dependencies, {
      lastAttemptAt: attemptedAt,
      lastSuccessfulSyncAt,
      lastOutcome: 'error',
      errorCode: 'storage_failed',
    });
    throw new CalendarSyncError('storage_failed', 500, 'Shared calendar storage failed');
  }

  return { events, metadata: successMetadata };
}
