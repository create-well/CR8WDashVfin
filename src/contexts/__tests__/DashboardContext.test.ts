import { describe, expect, it, vi } from 'vitest';
import { forwardRetry } from '../retry';

describe('DashboardContext retry delegation', () => {
  it('forwards retry to the SyncProvider callback exactly once', () => {
    const requestSync = vi.fn();

    forwardRetry(requestSync);

    expect(requestSync).toHaveBeenCalledTimes(1);
  });
});
