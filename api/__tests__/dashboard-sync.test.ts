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

  it('does not treat a broad role or profile label as Engineering Delivery authorization', () => {
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-1', app_metadata: { cr8w_role: 'engineering' },
    })).toBe(false);
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-2', app_metadata: { cr8w_profile: 'engineering' },
    })).toBe(false);
  });

  it('allows Engineering Delivery only through an explicit server-managed capability', () => {
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-3', app_metadata: { cr8w_source_grants: ['engineeringDelivery'] },
    })).toBe(true);
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-4', app_metadata: { capabilities: { engineeringDelivery: { read: true } } },
    })).toBe(true);
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-5', app_metadata: { cr8w_source_grants: ['money'] },
    })).toBe(false);
  });

  it('fails closed for restricted sources when authorization metadata is malformed', () => {
    expect(canReadSource('engineeringDelivery', 'restricted', {
      id: 'user-6', app_metadata: { capabilities: { engineeringDelivery: 'read' } },
    })).toBe(false);
    expect(canReadSource('money', 'restricted', {
      id: 'user-7', app_metadata: { source_grants: { money: true } },
    })).toBe(false);
  });

  it('allows team sources for authenticated and unauthenticated read contexts', () => {
    expect(canReadSource('people', 'team', null)).toBe(true);
    expect(canReadSource('people', 'team', { id: 'user-1' })).toBe(true);
  });
});
