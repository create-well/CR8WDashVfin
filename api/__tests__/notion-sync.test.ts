import { describe, expect, it } from 'vitest';
import handler, { resolveSourceEntries, summarizeSourceResults, validateMirrorRecord, type MirrorRecord, type SourceFreshness, type SourceSyncResult } from '../notion-sync';
import { ENABLED_NOTION_SOURCES } from '../notion-sources';

function record(source: MirrorRecord['source'], id: string, editedAt: string | null): MirrorRecord {
  return {
    source,
    sourcePageId: id,
    sourceUrl: null,
    sourceLastEditedAt: editedAt,
    archived: false,
    properties: {},
  };
}

const previous: Record<string, SourceFreshness> = {
  people: { status: 'ok', recordCount: 3, sourceLastEditedAt: '2026-09-09T10:00:00.000Z', lastSuccessfulSyncAt: '2026-09-09T10:05:00.000Z' },
  money: { status: 'ok', recordCount: 2, sourceLastEditedAt: '2026-09-09T11:00:00.000Z', lastSuccessfulSyncAt: '2026-09-09T11:05:00.000Z' },
};

describe('Notion source-isolation reducer', () => {
  it('keeps successful results and retains the prior snapshot count for a failed source', () => {
    const results: SourceSyncResult[] = [
      { source: 'people', records: [record('people', 'person-1', '2026-09-10T10:00:00.000Z')], error: null },
      { source: 'money', records: null, error: 'Notion request failed with status 429' },
    ];

    const summary = summarizeSourceResults(results, previous, '2026-09-10T10:05:00.000Z');

    expect(summary.recordsSeen).toBe(1);
    expect(summary.counts).toEqual({ people: 1, money: 2 });
    expect(summary.successful.map(result => result.source)).toEqual(['people']);
    expect(summary.failed.map(result => result.source)).toEqual(['money']);
    expect(summary.sourceFreshness.people).toMatchObject({ status: 'ok', recordCount: 1, lastSuccessfulSyncAt: '2026-09-10T10:05:00.000Z' });
    expect(summary.sourceFreshness.money).toMatchObject({ status: 'error', recordCount: 2, lastSuccessfulSyncAt: '2026-09-09T11:05:00.000Z', error: 'Notion request failed with status 429' });
  });

  it('uses the newest successful source edit as the aggregate edit time', () => {
    const results: SourceSyncResult[] = [
      { source: 'people', records: [record('people', 'person-1', '2026-09-10T09:00:00.000Z')], error: null },
      { source: 'money', records: [record('money', 'money-1', '2026-09-10T12:00:00.000Z')], error: null },
    ];

    expect(summarizeSourceResults(results, {}, '2026-09-10T12:05:00.000Z').latestSourceEdit).toBe('2026-09-10T12:00:00.000Z');
  });

  it('clears a prior source error after a later successful run', () => {
    const previousWithError: Record<string, SourceFreshness> = {
      money: { status: 'error', recordCount: 4, sourceLastEditedAt: '2026-09-09T11:00:00.000Z', lastSuccessfulSyncAt: '2026-09-09T11:05:00.000Z', error: 'timeout' },
    };
    const summary = summarizeSourceResults([
      { source: 'money', records: [record('money', 'money-1', '2026-09-10T12:00:00.000Z')], error: null },
    ], previousWithError, '2026-09-10T12:05:00.000Z');

    expect(summary.sourceFreshness.money).toEqual({ status: 'ok', recordCount: 1, sourceLastEditedAt: '2026-09-10T12:00:00.000Z', lastSuccessfulSyncAt: '2026-09-10T12:05:00.000Z' });
  });

  it('does not invent a new aggregate edit time when every source fails', () => {
    const summary = summarizeSourceResults([
      { source: 'people', records: null, error: 'timeout' },
      { source: 'money', records: null, error: 'unauthorized' },
    ], previous, '2026-09-10T12:05:00.000Z');

    expect(summary.successful).toHaveLength(0);
    expect(summary.recordsSeen).toBe(0);
    expect(summary.latestSourceEdit).toBe('2026-09-09T11:00:00.000Z');
    expect(summary.sourceFreshness.people.status).toBe('error');
    expect(summary.sourceFreshness.money.status).toBe('error');
  });

  it('creates a complete unavailable baseline when a source fails without prior metadata', () => {
    const summary = summarizeSourceResults([
      { source: 'flows', records: null, error: 'Notion request failed with status 503' },
    ], {}, '2026-09-10T12:05:00.000Z');

    expect(summary.counts).toEqual({ flows: 0 });
    expect(summary.recordsSeen).toBe(0);
    expect(summary.latestSourceEdit).toBeNull();
    expect(summary.sourceFreshness.flows).toEqual({
      status: 'error',
      recordCount: 0,
      sourceLastEditedAt: null,
      lastSuccessfulSyncAt: null,
      error: 'Notion request failed with status 503',
    });
  });

  it('marks an empty successful source healthy without inventing an edit timestamp', () => {
    const summary = summarizeSourceResults([
      { source: 'content', records: [], error: null },
    ], {}, '2026-09-10T12:05:00.000Z');

    expect(summary.successful.map(result => result.source)).toEqual(['content']);
    expect(summary.failed).toHaveLength(0);
    expect(summary.sourceFreshness.content).toEqual({
      status: 'ok',
      recordCount: 0,
      sourceLastEditedAt: null,
      lastSuccessfulSyncAt: '2026-09-10T12:05:00.000Z',
    });
  });

  it('keeps the aggregate edit time null when successful records lack edit timestamps', () => {
    const summary = summarizeSourceResults([
      { source: 'moves', records: [record('moves', 'move-1', null)], error: null },
    ], {}, '2026-09-10T12:05:00.000Z');

    expect(summary.recordsSeen).toBe(1);
    expect(summary.latestSourceEdit).toBeNull();
    expect(summary.sourceFreshness.moves.sourceLastEditedAt).toBeNull();
  });
});

describe('sources request filter', () => {
  it('defaults to every enabled source when no filter is given', () => {
    const selection = resolveSourceEntries(undefined);
    expect(selection.error).toBeNull();
    expect(selection.entries?.map(([source]) => source)).toEqual(ENABLED_NOTION_SOURCES.map(([source]) => source));
  });

  it('selects only the requested enabled sources', () => {
    const selection = resolveSourceEntries(['flows', 'content']);
    expect(selection.error).toBeNull();
    expect(selection.entries?.map(([source]) => source)).toEqual(['flows', 'content']);
  });

  it('rejects an empty source list', () => {
    expect(resolveSourceEntries([]).error).toMatch(/at least one source/);
  });

  it('rejects unknown source keys', () => {
    expect(resolveSourceEntries(['flows', 'not-a-source']).error).toBeTruthy();
  });

  it('rejects non-string entries', () => {
    expect(resolveSourceEntries([42]).error).toBeTruthy();
  });

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

  it('answers HTTP 400 for an invalid sources list without touching the database', async () => {
    process.env.NOTION_SYNC_OPERATOR_TOKEN = 'test-operator-token';
    const req = { method: 'POST', headers: { authorization: 'Bearer test-operator-token' }, body: { sources: ['not-a-source'] } };
    const res = stubResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toMatchObject({ error: expect.stringContaining('sources') });
  });

  it('does not reject a valid sources list with 400', async () => {
    process.env.NOTION_SYNC_OPERATOR_TOKEN = 'test-operator-token';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    const req = { method: 'POST', headers: { authorization: 'Bearer test-operator-token' }, body: { dryRun: true, sources: ['flows'] } };
    const res = stubResponse();

    await handler(req as never, res as never);

    // Passed validation and auth; fails later on missing Supabase config.
    expect(res.statusCode).toBe(500);
    expect(res.payload).toMatchObject({ error: 'Missing Supabase server configuration' });
  });
});

describe('mirror record contract validation', () => {
  function typedRecord(overrides: Partial<MirrorRecord> = {}): MirrorRecord {
    return {
      source: 'people',
      sourcePageId: 'page-1',
      sourceUrl: null,
      sourceLastEditedAt: '2026-09-10T10:00:00.000Z',
      archived: false,
      properties: {
        Name: { type: 'title', value: 'Ada', sensitivity: 'team', sourceProperty: 'Name' },
      },
      ...overrides,
    };
  }

  it('accepts a well-formed typed record', () => {
    expect(validateMirrorRecord(typedRecord(), true)).toEqual([]);
  });

  it('flags a missing stable page ID and an unknown source', () => {
    const issues = validateMirrorRecord(typedRecord({ source: 'nope' as never, sourcePageId: '' }), true);
    expect(issues.map(issue => issue.path)).toEqual(expect.arrayContaining(['source', 'sourcePageId']));
  });

  it('flags malformed envelopes in typed mode', () => {
    const broken = typedRecord({
      properties: {
        Amount: { type: 'number', value: Number.POSITIVE_INFINITY, sensitivity: 'team', sourceProperty: 'Amount' },
        Bad: { value: 1 },
        Plain: 7,
      } as never,
    });
    const paths = validateMirrorRecord(broken, true).map(issue => issue.path);
    expect(paths).toEqual(expect.arrayContaining([
      'properties.Amount.value',
      'properties.Bad.type',
      'properties.Bad.sensitivity',
      'properties.Bad.sourceProperty',
      'properties.Plain',
    ]));
  });

  it('skips envelope checks for untyped sources but still checks record fields', () => {
    const untyped = typedRecord({ properties: { Name: 'Ada' } });
    expect(validateMirrorRecord(untyped, false)).toEqual([]);
    expect(validateMirrorRecord(untyped, false).some(issue => issue.path.startsWith('properties.'))).toBe(false);
  });
});
