import { describe, expect, it } from 'vitest';
import {
  SHARED_EVENTS_LABEL,
  personalCalendarAuthMessage,
  sharedEventsAvailableNote,
} from '../calendarMessaging';

describe('calendar messaging (#26: personal auth vs shared events)', () => {
  it('scopes personal Google auth failures to the personal layer', () => {
    const msg = personalCalendarAuthMessage('Session expired — reconnect Google Calendar');
    expect(msg).toContain('Personal calendar connection issue');
    expect(msg).toContain('Session expired');
    // Must not read as an overall calendar outage.
    expect(msg.toLowerCase()).not.toContain("couldn't load your events");
  });

  it('keeps shared events available note distinct from the personal error', () => {
    const note = sharedEventsAvailableNote(true);
    expect(note).toBe('Shared community events above are still available.');
    expect(note).not.toContain('Personal');
  });

  it('omits the shared note when there are no shared events to reassure about', () => {
    expect(sharedEventsAvailableNote(false)).toBeNull();
  });

  it('labels the upcoming-events preview as the shared/community source', () => {
    expect(SHARED_EVENTS_LABEL).toContain('next up');
    expect(SHARED_EVENTS_LABEL).toContain('shared/community');
  });
});
