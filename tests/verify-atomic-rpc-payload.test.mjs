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
