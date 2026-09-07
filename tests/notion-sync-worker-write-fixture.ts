import assert from 'node:assert/strict';
import {
  syncSource,
  type NormalizedRecord,
  type NotionPage,
  type SyncTotals,
  type WriteStore,
} from '../scripts/notion-sync-worker.ts';

const mapping = {
  source: 'projects',
  dataSourceId: 'projects-data-source',
  identity: 'page_id' as const,
};

function notionPage(id: string): NotionPage {
  return {
    id,
    url: `https://notion.example/${id}`,
    last_edited_time: '2026-09-06T00:00:00.000Z',
    archived: false,
    properties: {
      Name: { type: 'title', title: [{ plain_text: id }] },
    },
  };
}

class FakeStore implements WriteStore {
  checkpoint: string | null;
  calls: string[] = [];
  failUpsert = false;

  constructor(checkpoint: string | null) {
    this.checkpoint = checkpoint;
  }

  async getCheckpoint() {
    this.calls.push('get');
    return this.checkpoint;
  }

  async insertDeadLetters() {
    this.calls.push('dead-letters');
  }

  async upsertRecords(_records: NormalizedRecord[]) {
    this.calls.push('upsert');
    if (this.failUpsert) throw new Error('mock upsert failure');
  }

  async saveCheckpoint(_source: string, _runId: string, _recordsSynced: number, nextCursor: string | null) {
    this.calls.push('checkpoint');
    this.checkpoint = nextCursor;
  }

  async startRun() {}
  async finishRun() {}
}

function totals(): SyncTotals {
  return { planned: 0, written: 0, deadLetters: 0 };
}

const continuingStore = new FakeStore('cursor-1');
await syncSource({
  mapping,
  apiUrl: 'https://notion.example/v1',
  apiKey: 'test-key',
  apiVersion: 'test-version',
  limit: 1,
  runId: 'run-1',
  store: continuingStore,
  totals: totals(),
  queryPage: async (_url, _key, _version, _sourceId, pageSize, startCursor) => {
    assert.equal(pageSize, 1);
    assert.equal(startCursor, 'cursor-1');
    return { results: [notionPage('page-1')], hasMore: true, nextCursor: 'cursor-2' };
  },
});
assert.equal(continuingStore.checkpoint, 'cursor-2');
assert.deepEqual(continuingStore.calls, ['get', 'dead-letters', 'upsert', 'checkpoint']);

continuingStore.calls = [];
await syncSource({
  mapping,
  apiUrl: 'https://notion.example/v1',
  apiKey: 'test-key',
  apiVersion: 'test-version',
  limit: 1,
  runId: 'run-2',
  store: continuingStore,
  totals: totals(),
  queryPage: async (_url, _key, _version, _sourceId, _pageSize, startCursor) => {
    assert.equal(startCursor, 'cursor-2');
    return { results: [notionPage('page-2')], hasMore: false, nextCursor: null };
  },
});
assert.equal(continuingStore.checkpoint, null);
assert.deepEqual(continuingStore.calls, ['get', 'dead-letters', 'upsert', 'checkpoint']);

const failingStore = new FakeStore('cursor-3');
failingStore.failUpsert = true;
const failedTotals = totals();
await assert.rejects(
  syncSource({
    mapping,
    apiUrl: 'https://notion.example/v1',
    apiKey: 'test-key',
    apiVersion: 'test-version',
    limit: 1,
    runId: 'run-3',
    store: failingStore,
    totals: failedTotals,
    queryPage: async () => ({
      results: [notionPage('page-3')],
      hasMore: true,
      nextCursor: 'cursor-4',
    }),
  }),
  /mock upsert failure/,
);
assert.equal(failingStore.checkpoint, 'cursor-3');
assert.deepEqual(failingStore.calls, ['get', 'dead-letters', 'upsert']);
assert.deepEqual(failedTotals, { planned: 1, written: 0, deadLetters: 0 });
