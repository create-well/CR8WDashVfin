import { describe, expect, it } from 'vitest';
import { bearerToken, canReadSource, sourceCapabilities } from '../dashboard-sync';

describe('dashboard source authorization', () => {
  it('parses only a well-formed bearer token', () => {
    expect(bearerToken('Bearer abc123')).toBe('abc123');
    expect(bearerToken('bearer abc123')).toBe('abc123');
    expect(bearerToken('Basic abc123')).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });

  it('fails closed for restricted sources without a validated user', () => {
    expect(canReadSource('engineeringDelivery', 'restricted', null)).toBe(false);
    expect(sourceCapabilities(null).engineeringDelivery.restricted).toBe(false);
    expect(sourceCapabilities(null).people.restricted).toBe(true);
  });

  it('does not treat profile metadata as a restricted-source grant', () => {
    const user = { id: 'user-1', app_metadata: { cr8w_profile: 'engineering' } };
    expect(canReadSource('engineeringDelivery', 'restricted', user)).toBe(false);
  });

  it('allows only server-managed roles or explicit source grants', () => {
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-1', app_metadata: { cr8w_role: 'engineering' },
    })).toBe(true);
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-2', app_metadata: { cr8w_source_grants: ['engineeringDelivery'] },
    })).toBe(true);
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-3', app_metadata: { cr8w_source_grants: ['money'] },
    })).toBe(false);
  });

  it('allows team sources for authenticated and unauthenticated read contexts', () => {
    expect(canReadSource('people', 'team', null)).toBe(true);
    expect(canReadSource('people', 'team', { id: 'user-1' })).toBe(true);
  });
});
