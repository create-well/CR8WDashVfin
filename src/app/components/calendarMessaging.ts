// Personal-vs-shared calendar messaging for the home view, extracted from
// HubView so the #26 behavior (personal Google auth failures must not present
// as an overall calendar outage, and the shared events preview stays
// authoritative) can be tested without a React render harness.

/** Label for the shared/community upcoming-events preview. */
export const SHARED_EVENTS_LABEL = '📅 next up · shared/community events';

/**
 * Message shown for a personal Google Calendar connection/auth failure.
 * Always prefixed so it is clearly scoped to the personal layer and never
 * reads as an outage of the shared/community events.
 */
export function personalCalendarAuthMessage(rawError: string): string {
  return `Personal calendar connection issue: ${rawError}`;
}

/**
 * Clarifier shown alongside a personal auth failure while shared events exist,
 * so the operator knows the community events above are unaffected.
 */
export function sharedEventsAvailableNote(hasSharedEvents: boolean): string | null {
  return hasSharedEvents ? 'Shared community events above are still available.' : null;
}
