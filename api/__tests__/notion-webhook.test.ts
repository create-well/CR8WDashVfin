// @vitest-environment node
import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENABLED_NOTION_SOURCES, NOTION_SOURCES } from '../notion-sources';

const runSyncMock = vi.fn(async () => ({
  ok: true,
  runId: 'notion-webhook-test-run',
  counts: { people: 1 },
  recordsSeen: 1,
}));

vi.mock('../notion-sync.js', () => ({
  runSync: (...args: unknown[]) => runSyncMock(...args as []),
}));

// In-memory stand-in for public.kv_store_8dcd9693 so debounce logic is testable.
const kvStore = new Map<string, string>();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, key: string) => ({
          maybeSingle: async () => kvStore.has(key)
            ? { data: { value: kvStore.get(key) }, error: null }
            : { data: null, error: null },
        }),
      }),
      upsert: async ({ key, value }: { key: string; value: string }) => {
        kvStore.set(key, value);
        return { error: null };
      },
    }),
  }),
}));

import handler from '../notion-webhook';

const SECRET = 'test-webhook-secret';

function rawOf(body: unknown): Buffer {
  return Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
}

function stubRequest(body: unknown, options: { method?: string; sign?: boolean; secret?: string } = {}) {
  const { method = 'POST', sign = true, secret = SECRET } = options;
  const raw = rawOf(body);
  const headers: Record<string, string> = {};
  if (sign) headers['x-notion-signature'] = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() { yield raw; },
  };
}

function stubResponse() {
  return {
    statusCode: 200,
    payload: null as unknown,
    setHeader() { /* noop */ },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.payload = body; return this; },
    end() { /* noop */ },
  };
}

beforeEach(() => {
  kvStore.clear();
  runSyncMock.mockClear();
  process.env.NOTION_WEBHOOK_SECRET = SECRET;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

describe('Notion webhook verification handshake', () => {
  it('answers 200 and logs the verification token with the log prefix', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = stubResponse();

    await handler(stubRequest({ verification_token: 'tok-abc-123' }, { sign: false }) as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('[notion-webhook] verification_token=tok-abc-123');
    expect(runSyncMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('does not write the verification token to the KV mirror', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handler(stubRequest({ verification_token: 'tok-abc-123' }, { sign: false }) as never, stubResponse() as never);
    expect(kvStore.size).toBe(0);
    logSpy.mockRestore();
  });
});

describe('Notion webhook signature verification', () => {
  it('returns 401 when NOTION_WEBHOOK_SECRET is unset', async () => {
    delete process.env.NOTION_WEBHOOK_SECRET;
    const res = stubResponse();
    await handler(stubRequest({ type: 'page.content_updated' }) as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(runSyncMock).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid signature', async () => {
    const res = stubResponse();
    await handler(stubRequest({ type: 'page.content_updated' }, { secret: 'wrong-secret' }) as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(res.payload).toMatchObject({ error: 'Invalid signature' });
    expect(runSyncMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the signature header is missing', async () => {
    const res = stubResponse();
    await handler(stubRequest({ type: 'page.content_updated' }, { sign: false }) as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(runSyncMock).not.toHaveBeenCalled();
  });
});

describe('Notion webhook event deliveries', () => {
  it('returns 405 for non-POST requests', async () => {
    const res = stubResponse();
    await handler(stubRequest({}, { method: 'GET' }) as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it('syncs only the source matching the event data_source_id', async () => {
    const res = stubResponse();
    const body = { type: 'data_source.content_updated', data_source_id: NOTION_SOURCES.people.dataSourceId };

    await handler(stubRequest(body) as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true, sources: ['people'], counts: { people: 1 } });
    expect(runSyncMock).toHaveBeenCalledTimes(1);
    const [dryRun, entries] = runSyncMock.mock.calls[0];
    expect(dryRun).toBe(false);
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toBe('people');
  });

  it('syncs all enabled sources when no data_source_id is present', async () => {
    const res = stubResponse();
    await handler(stubRequest({ type: 'page.content_updated' }) as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(runSyncMock).toHaveBeenCalledTimes(1);
    const [, entries] = runSyncMock.mock.calls[0];
    expect(entries.map(([source]: [string]) => source)).toEqual(ENABLED_NOTION_SOURCES.map(([source]) => source));
  });

  it('debounces a second event within 20 seconds', async () => {
    const body = { type: 'page.content_updated' };
    const first = stubResponse();
    const second = stubResponse();

    await handler(stubRequest(body) as never, first as never);
    await handler(stubRequest(body) as never, second as never);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.payload).toMatchObject({ ok: true, skipped: 'debounced' });
    expect(runSyncMock).toHaveBeenCalledTimes(1);
  });

  it('answers 200 without retry-storming for a malformed-but-posted body', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = stubResponse();
    await handler(stubRequest('not-json{{{', { sign: false }) as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: false });
    expect(runSyncMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
