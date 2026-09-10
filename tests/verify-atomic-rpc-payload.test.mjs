import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildValidRpcPayload,
  MockKvTransaction,
  runMockVerification,
} from '../scripts/verify-atomic-rpc-payload.mjs';

test('runs the complete mock RPC verification scenario', async () => {
  const result = await runMockVerification();
  assert.deepEqual(result, {
    validCommit: true,
    absentKeyDeletion: true,
    failureRollback: true,
    semanticValidation: true,
  });
});

test('rejects a text-backed RPC payload with a non-string value', async () => {
  const payload = buildValidRpcPayload();
  payload.snapshots[0].value = [{ invalid: 'jsonb-style direct value' }];
  const db = new MockKvTransaction();

  await assert.rejects(db.rpc(payload), /text-backed RPC requires string values/);
});

test('rejects duplicate keys without changing committed state', async () => {
  const payload = buildValidRpcPayload();
  payload.snapshots.push({ ...payload.snapshots[0] });
  const db = new MockKvTransaction({ sentinel: 'unchanged' });

  await assert.rejects(db.rpc(payload), /duplicate or malformed snapshot key/);
  assert.equal(db.get('sentinel'), 'unchanged');
  assert.equal(db.get('cr8w_notion_mirror_flows'), undefined);
});

test('rejects metadata count mismatch without changing committed state', async () => {
  const payload = buildValidRpcPayload();
  const metadata = JSON.parse(payload.snapshots.at(-1).value);
  metadata.counts.flows = 99;
  payload.snapshots.at(-1).value = JSON.stringify(metadata);
  const db = new MockKvTransaction({ sentinel: 'unchanged' });

  await assert.rejects(db.rpc(payload), /metadata count mismatch/);
  assert.equal(db.get('sentinel'), 'unchanged');
  assert.equal(db.get('cr8w_notion_mirror_flows'), undefined);
});

test('accepts a matching source_last_edited_at value', async () => {
  const timestamp = '2026-09-10T18:00:00.000Z';
  const payload = buildValidRpcPayload({ sourceLastEditedAt: timestamp });
  const db = new MockKvTransaction();
  const result = await db.rpc(payload);

  assert.equal(result.committed, true);
});

test('rejects a source_last_edited_at mismatch and future timestamp', async () => {
  const mismatch = buildValidRpcPayload({ sourceLastEditedAt: '2026-09-10T18:00:00.000Z' });
  const metadata = JSON.parse(mismatch.snapshots.at(-1).value);
  metadata.sourceLastEditedAt = '2026-09-10T18:01:00.000Z';
  mismatch.snapshots.at(-1).value = JSON.stringify(metadata);
  const db = new MockKvTransaction();
  await assert.rejects(db.rpc(mismatch), /source_last_edited_at mismatch/);

  const future = buildValidRpcPayload({ sourceLastEditedAt: '2999-01-01T00:00:00.000Z' });
  await assert.rejects(db.rpc(future), /source_last_edited_at cannot be in the future/);
});
