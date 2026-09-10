import { describe, expect, it } from 'vitest';
import { summarizeSourceResults, type MirrorRecord, type SourceFreshness, type SourceSyncResult } from '../notion-sync';

function record(source: MirrorRecord['source'], id: string, editedAt: string): MirrorRecord {
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
});
