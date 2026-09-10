#!/usr/bin/env node

import assert from 'node:assert/strict';

export const MIRROR_KEYS = new Set([
  'cr8w_notion_mirror_people',
  'cr8w_notion_mirror_flows',
  'cr8w_notion_mirror_moves',
  'cr8w_notion_mirror_content',
  'cr8w_notion_mirror_money',
  'cr8w_notion_sync_meta',
]);

export function buildValidRpcPayload({ runId = 'notion-mock-run', includeAbsent = false, sourceLastEditedAt = null } = {}) {
  const flows = [{
    recordSchemaVersion: 2,
    source: 'flows',
    sourcePageId: 'flow-page-1',
    sourceUrl: null,
    sourceLastEditedAt,
    archived: false,
    properties: {
      'Public?': { notionType: 'checkbox', value: true, displayValue: 'Yes', sensitivity: 'team', isEmpty: false },
      Capacity: { notionType: 'number', value: 12, displayValue: '12', sensitivity: 'team', isEmpty: false },
    },
  }];
  const content = [{
    recordSchemaVersion: 2,
    source: 'content',
    sourcePageId: 'content-page-1',
    sourceUrl: null,
    sourceLastEditedAt,
    archived: false,
    properties: { 'Final?': { notionType: 'checkbox', value: false, displayValue: 'No', sensitivity: 'team', isEmpty: false } },
  }];
  const metadata = {
    source: 'notion',
    mirrorUpdatedAt: '2026-09-10T19:00:00.000Z',
    sourceLastEditedAt,
    syncRunId: runId,
    counts: { flows: flows.length, content: content.length },
    recordSchemaVersion: 2,
    typedSources: ['flows', 'content'],
  };
  const snapshots = [
    { key: 'cr8w_notion_mirror_flows', present: true, value: JSON.stringify(flows) },
    { key: 'cr8w_notion_mirror_content', present: true, value: JSON.stringify(content) },
    { key: 'cr8w_notion_sync_meta', present: true, value: JSON.stringify(metadata) },
  ];
  if (includeAbsent) snapshots.splice(1, 0, { key: 'cr8w_notion_mirror_moves', present: false });
  return { run_id: runId, record_schema_version: 2, typed_sources: ['flows', 'content'], source_last_edited_at: sourceLastEditedAt, snapshots };
}

export class MockKvTransaction {
  constructor(initial = {}) {
    this.committed = new Map(Object.entries(initial));
    this.failOnKey = null;
  }
  async rpc(payload) {
    const working = new Map(this.committed);
    const seen = new Set();
    const metadataBySource = new Map();
    let metadata = null;
    let writes = 0;
    try {
      if (!payload.run_id || payload.record_schema_version !== 2 || !Array.isArray(payload.typed_sources) || !Array.isArray(payload.snapshots) || payload.snapshots.length === 0) throw new Error('invalid RPC envelope');
      if (payload.source_last_edited_at !== null && (!Number.isFinite(Date.parse(payload.source_last_edited_at)) || Date.parse(payload.source_last_edited_at) > Date.now())) throw new Error('source_last_edited_at cannot be in the future or invalid');
      for (const item of payload.snapshots) {
        if (!item || typeof item !== 'object' || typeof item.key !== 'string' || seen.has(item.key)) throw new Error('duplicate or malformed snapshot key');
        seen.add(item.key);
        if (!MIRROR_KEYS.has(item.key) || typeof item.present !== 'boolean') throw new Error('unapproved key or present type');
        if (item.present !== true) continue;
        if (typeof item.value !== 'string') throw new Error('text-backed RPC requires string values');
        const parsed = JSON.parse(item.value);
        if (item.key === 'cr8w_notion_sync_meta') {
          if (!parsed || Array.isArray(parsed) || parsed.source !== 'notion' || parsed.recordSchemaVersion !== 2 || parsed.syncRunId !== payload.run_id || !parsed.counts || Array.isArray(parsed.counts)) throw new Error('invalid sync metadata');
          if (payload.source_last_edited_at === null ? parsed.sourceLastEditedAt !== null : parsed.sourceLastEditedAt !== payload.source_last_edited_at) throw new Error('source_last_edited_at mismatch');
          metadata = parsed;
        } else {
          if (!Array.isArray(parsed)) throw new Error('source snapshot must be an array');
          const source = item.key.replace('cr8w_notion_mirror_', '');
          for (const record of parsed) {
            if (!record || record.source !== source || typeof record.sourcePageId !== 'string' || !record.properties || Array.isArray(record.properties) || record.recordSchemaVersion !== 2 || typeof record.archived !== 'boolean') throw new Error(`invalid ${source} record`);
          }
          metadataBySource.set(source, parsed.length);
        }
      }
      if (!metadata) throw new Error('sync metadata must be present');
      for (const [source, count] of metadataBySource) if (metadata.counts[source] !== count) throw new Error(`metadata count mismatch for ${source}`);
      for (const item of payload.snapshots) {
        if (this.failOnKey === item.key) throw new Error(`injected write failure for ${item.key}`);
        if (item.present) working.set(item.key, item.value);
        else working.delete(item.key);
        writes += 1;
      }
      this.committed = working;
      return { committed: true, run_id: payload.run_id, keys_written: writes, record_schema_version: 2, typed_sources: payload.typed_sources };
    } catch (error) {
      throw new Error(`RPC rolled back: ${error.message}`, { cause: error });
    }
  }
  get(key) { return this.committed.get(key); }
}

export async function runMockVerification() {
  const valid = buildValidRpcPayload();
  const db = new MockKvTransaction({
    cr8w_notion_mirror_flows: 'old-flows',
    cr8w_notion_mirror_content: 'old-content',
    cr8w_notion_sync_meta: 'old-meta',
  });
  const result = await db.rpc(valid);
  assert.equal(result.committed, true);
  assert.equal(result.keys_written, 3);
  assert.equal(db.get('cr8w_notion_sync_meta'), valid.snapshots[2].value);
  assert.equal(db.get('cr8w_notion_mirror_flows'), valid.snapshots[0].value);

  const absent = buildValidRpcPayload({ runId: 'notion-absent-run', includeAbsent: true });
  await db.rpc(absent);
  assert.equal(db.get('cr8w_notion_mirror_moves'), undefined);

  const failing = new MockKvTransaction({ cr8w_notion_mirror_flows: 'before', cr8w_notion_mirror_content: 'before-content', cr8w_notion_sync_meta: 'before-meta' });
  failing.failOnKey = 'cr8w_notion_mirror_content';
  await assert.rejects(failing.rpc(valid), /RPC rolled back/);
  assert.equal(failing.get('cr8w_notion_mirror_flows'), 'before');
  assert.equal(failing.get('cr8w_notion_mirror_content'), 'before-content');
  assert.equal(failing.get('cr8w_notion_sync_meta'), 'before-meta');

  const malformed = buildValidRpcPayload();
  malformed.snapshots[0].value = JSON.stringify([{ source: 'wrong', sourcePageId: 'x', properties: {}, recordSchemaVersion: 2, archived: false }]);
  await assert.rejects(db.rpc(malformed), /RPC rolled back/);

  return { validCommit: true, absentKeyDeletion: true, failureRollback: true, semanticValidation: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMockVerification().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
