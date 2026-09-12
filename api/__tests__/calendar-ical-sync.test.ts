import { describe, expect, it, vi } from 'vitest';
import {
  CalendarSyncError,
  parseCalendarIcal,
  syncCalendarIcal,
  type CalendarSyncDependencies,
} from '../calendar-ical-sync.js';
import { CALENDAR_EVENTS_KEY, CALENDAR_SYNC_META_KEY } from '../calendar-sync-health.js';

const NOW = new Date('2026-09-11T12:00:00.000Z');
const EMPTY_FEED = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
const EVENT_FEED = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:event-1',
  'SUMMARY:Create Well\\, Together',
  'DTSTART:20260911T150000Z',
  'DTEND:20260911T160000Z',
  'LOCATION:The Well',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

function dependencies(overrides: Partial<CalendarSyncDependencies> = {}): CalendarSyncDependencies {
  return {
    fetchCalendar: vi.fn(async () => new Response(EVENT_FEED, { status: 200 })),
    readValue: vi.fn(async () => null),
    writeValue: vi.fn(async () => undefined),
    now: () => NOW,
    ...overrides,
  };
}

describe('parseCalendarIcal', () => {
  it('accepts a valid empty calendar', () => {
    expect(parseCalendarIcal(EMPTY_FEED, NOW.toISOString())).toEqual([]);
  });

  it('converts TZID event times to the correct UTC instant', () => {
    const feed = EVENT_FEED
      .replace('DTSTART:20260911T150000Z', 'DTSTART;TZID=America/New_York:20260911T150000')
      .replace('DTEND:20260911T160000Z', 'DTEND;TZID=America/New_York:20260911T160000');

    expect(parseCalendarIcal(feed, NOW.toISOString())[0]).toMatchObject({
      start: '2026-09-11T19:00:00.000Z',
      end: '2026-09-11T20:00:00.000Z',
    });
  });

  it.each([
    ['missing DTSTART', EVENT_FEED.replace('DTSTART:20260911T150000Z\r\n', '')],
    ['invalid DTSTART', EVENT_FEED.replace('20260911T150000Z', '20260230T150000Z')],
    ['invalid TZID', EVENT_FEED.replace('DTSTART:20260911T150000Z', 'DTSTART;TZID=Not/A_Zone:20260911T150000')],
  ])('rejects an event with %s', (_name, feed) => {
    expect(() => parseCalendarIcal(feed, NOW.toISOString()))
      .toThrowError(CalendarSyncError);
  });

  it('rejects an unusable payload', () => {
    expect(() => parseCalendarIcal('<html>not a calendar</html>', NOW.toISOString()))
      .toThrowError(CalendarSyncError);
  });
});

describe('syncCalendarIcal', () => {
  it('writes events before success metadata', async () => {
    const deps = dependencies();
    const result = await syncCalendarIcal('https://calendar.example/team.ics', deps);
    const writes = vi.mocked(deps.writeValue).mock.calls;

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ id: 'event-1', title: 'Create Well, Together' });
    expect(writes.map(([key]) => key)).toEqual([CALENDAR_EVENTS_KEY, CALENDAR_SYNC_META_KEY]);
  });

  it('stores an empty valid feed as a successful snapshot', async () => {
    const deps = dependencies({
      fetchCalendar: vi.fn(async () => new Response(EMPTY_FEED, { status: 200 })),
    });
    const result = await syncCalendarIcal('https://calendar.example/team.ics', deps);

    expect(result.events).toEqual([]);
    expect(vi.mocked(deps.writeValue).mock.calls[0][0]).toBe(CALENDAR_EVENTS_KEY);
  });

  it.each([
    {
      name: 'missing configuration',
      url: undefined,
      fetchCalendar: vi.fn(),
      expectedCode: 'unknown',
    },
    {
      name: 'fetch failure',
      url: 'https://calendar.example/team.ics',
      fetchCalendar: vi.fn(async () => new Response('', { status: 503 })),
      expectedCode: 'fetch_failed',
    },
    {
      name: 'parse failure',
      url: 'https://calendar.example/team.ics',
      fetchCalendar: vi.fn(async () => new Response('not ical', { status: 200 })),
      expectedCode: 'parse_failed',
    },
  ])('preserves events on $name', async ({ url, fetchCalendar, expectedCode }) => {
    const deps = dependencies({ fetchCalendar });

    await expect(syncCalendarIcal(url, deps)).rejects.toMatchObject({ code: expectedCode });
    expect(vi.mocked(deps.writeValue).mock.calls.every(([key]) => key !== CALENDAR_EVENTS_KEY)).toBe(true);
  });

  it('classifies an event mirror write failure without reporting success', async () => {
    const writeValue = vi.fn(async (key: string) => {
      if (key === CALENDAR_EVENTS_KEY) throw new Error('database unavailable');
    });
    const deps = dependencies({ writeValue });

    await expect(syncCalendarIcal('https://calendar.example/team.ics', deps))
      .rejects.toMatchObject({ code: 'storage_failed' });
    expect(writeValue).toHaveBeenCalledWith(
      CALENDAR_SYNC_META_KEY,
      expect.stringContaining('"errorCode":"storage_failed"'),
    );
  });

  it('preserves the event mirror when DTSTART is invalid', async () => {
    const deps = dependencies({
      fetchCalendar: vi.fn(async () => new Response(
        EVENT_FEED.replace('20260911T150000Z', 'not-a-date'),
        { status: 200 },
      )),
    });

    await expect(syncCalendarIcal('https://calendar.example/team.ics', deps))
      .rejects.toMatchObject({ code: 'parse_failed' });
    expect(vi.mocked(deps.writeValue).mock.calls.every(([key]) => key !== CALENDAR_EVENTS_KEY)).toBe(true);
  });
});
