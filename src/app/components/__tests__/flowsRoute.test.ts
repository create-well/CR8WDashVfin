import { describe, expect, it } from 'vitest';
import { getFlowsViewState } from '../../pages/flowsViewState';
import { NAV_ITEMS } from '../navItems';

describe('getFlowsViewState (FLOWS route behavior)', () => {
  it('renders the empty state when workshop collections are undefined', () => {
    // Live risk: upstream Notion FLOWS rows are not public, so the mirror can
    // omit these collections. The page must not throw on `.length`.
    expect(getFlowsViewState({ syncStatus: 'fresh' })).toBe('empty');
    expect(
      getFlowsViewState({ syncStatus: 'fresh', workshops: undefined, workshopPrograms: undefined }),
    ).toBe('empty');
  });

  it('renders the empty state for empty arrays', () => {
    expect(getFlowsViewState({ syncStatus: 'fresh', workshops: [], workshopPrograms: [] })).toBe('empty');
  });

  it('renders content when at least one workshop or program exists', () => {
    expect(getFlowsViewState({ syncStatus: 'fresh', workshops: [{}], workshopPrograms: [] })).toBe('fresh');
    expect(getFlowsViewState({ syncStatus: 'fresh', workshops: [], workshopPrograms: [{}] })).toBe('fresh');
  });

  it('renders the failed state (with retry) when sync fails', () => {
    expect(getFlowsViewState({ syncStatus: 'failed', workshops: [{}] })).toBe('failed');
  });

  it('renders loading and stale states from syncStatus', () => {
    expect(getFlowsViewState({ syncStatus: 'loading' })).toBe('loading');
    expect(getFlowsViewState({ syncStatus: 'stale', workshops: [{}] })).toBe('stale');
  });
});

describe('TopNav navigation model', () => {
  it('exposes one entry per path with a label and emoji', () => {
    expect(NAV_ITEMS.length).toBeGreaterThan(0);
    for (const item of NAV_ITEMS) {
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.emoji.length).toBeGreaterThan(0);
    }
  });

  it('keeps the home entry marked end for exact-match active styling', () => {
    expect(NAV_ITEMS.find((i) => i.path === '/')?.end).toBe(true);
  });
});
