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

interface CalendarProperty {
  value: string;
  parameters: Record<string, string>;
}

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function invalidCalendarDate(): never {
  throw new CalendarSyncError('parse_failed', 502, 'Calendar event has an invalid date');
}

function validDateParts(parts: CalendarDateParts): boolean {
  const date = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ));
  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day
    && date.getUTCHours() === parts.hour
    && date.getUTCMinutes() === parts.minute
    && date.getUTCSeconds() === parts.second;
}

function dateParts(value: string): CalendarDateParts | null {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/,
  );
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  };
  return validDateParts(parts) ? parts : null;
}

function zonedDateToIso(parts: CalendarDateParts, timeZone: string): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return invalidCalendarDate();
  }

  const desiredTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let candidate = desiredTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rendered = Object.fromEntries(
      formatter.formatToParts(candidate).map(part => [part.type, part.value]),
    );
    const renderedTime = Date.UTC(
      Number(rendered.year),
      Number(rendered.month) - 1,
      Number(rendered.day),
      Number(rendered.hour),
      Number(rendered.minute),
      Number(rendered.second),
    );
    const adjusted = candidate + (desiredTime - renderedTime);
    if (adjusted === candidate) break;
    candidate = adjusted;
  }

  const rendered = Object.fromEntries(
    formatter.formatToParts(candidate).map(part => [part.type, part.value]),
  );
  if (
    Number(rendered.year) !== parts.year
    || Number(rendered.month) !== parts.month
    || Number(rendered.day) !== parts.day
    || Number(rendered.hour) !== parts.hour
    || Number(rendered.minute) !== parts.minute
    || Number(rendered.second) !== parts.second
  ) {
    return invalidCalendarDate();
  }
  return new Date(candidate).toISOString();
}

function parseICalDate(property: CalendarProperty | null, required = false): string {
  if (!property?.value) {
    if (required) invalidCalendarDate();
    return '';
  }
  const parts = dateParts(property.value);
  if (!parts) return invalidCalendarDate();
  if (/^\d{8}$/.test(property.value)) {
    return `${property.value.slice(0, 4)}-${property.value.slice(4, 6)}-${property.value.slice(6, 8)}T00:00:00`;
  }
  if (property.value.endsWith('Z')) {
    return new Date(Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )).toISOString();
  }
  const timeZone = property.parameters.TZID;
  if (timeZone) return zonedDateToIso(parts, timeZone);
  return `${property.value.slice(0, 4)}-${property.value.slice(4, 6)}-${property.value.slice(6, 8)}T${property.value.slice(9, 11)}:${property.value.slice(11, 13)}:${property.value.slice(13, 15)}`;
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
    const property = (name: string): CalendarProperty | null => {
      const propertyMatch = block.match(
        new RegExp(`(?:^|\\r?\\n)${name}((?:;[^:\\r\\n]+)*):([^\\r\\n]*)`),
      );
      if (!propertyMatch) return null;
      const parameters = Object.fromEntries(
        propertyMatch[1]
          .split(';')
          .filter(Boolean)
          .map(parameter => {
            const separator = parameter.indexOf('=');
            const key = separator === -1 ? parameter : parameter.slice(0, separator);
            const value = separator === -1 ? '' : parameter.slice(separator + 1);
            return [key.toUpperCase(), value.replace(/^"|"$/g, '')];
          }),
      );
      return { value: unescapeICalText(propertyMatch[2]), parameters };
    };
    const textProperty = (name: string) => property(name)?.value ?? '';
    events.push({
      id: textProperty('UID') || `ical-${events.length}-${syncedAt}`,
      title: textProperty('SUMMARY') || '(No title)',
      start: parseICalDate(property('DTSTART'), true),
      end: parseICalDate(property('DTEND')),
      location: textProperty('LOCATION'),
      description: textProperty('DESCRIPTION'),
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
