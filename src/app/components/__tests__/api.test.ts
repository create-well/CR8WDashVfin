import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCalendarEvents, req } from '../api';

describe('api client req() helper', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('succeeds and returns parsed JSON on GET requests', async () => {
    const mockData = { success: true };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData)
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await req('GET', '/test');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('throws with status info on failed requests', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('Not Found')
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(req('GET', '/test')).rejects.toThrow('GET /test → 404: Not Found');
  });

  it('handles timeout behavior', async () => {
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const promise = req('POST', '/test');
    const assertion = expect(promise).rejects.toThrow('POST /test → timed out after 8s');

    // Fast-forward past timeout
    await vi.advanceTimersByTimeAsync(8000);

    await assertion;
  });

  it('retries GET requests on network errors', async () => {
    const abortError = { name: 'TypeError', message: 'Failed to fetch' };

    // First attempt fails, second succeeds
    vi.mocked(fetch).mockImplementationOnce(() => {
      throw abortError;
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ retrySuccess: true })
    } as any);

    const promise = req('GET', '/test');

    // Wait for the retry timeout
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ retrySuccess: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('normalizes a non-array calendar runtime response to an empty list', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok', runtime: 'vercel' }),
    } as any);

    await expect(getCalendarEvents()).resolves.toEqual([]);
  });
});
