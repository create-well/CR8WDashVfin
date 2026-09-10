import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNotionProperty,
  isNotionPropertyEnvelope,
  unwrapNotionProperty,
  validateNotionPropertyEnvelope,
  validateNotionMirrorRecord,
} from '../src/shared/notion-contract.ts';

test('normalizes checkbox properties as typed booleans', () => {
  const enabled = normalizeNotionProperty({ type: 'checkbox', checkbox: true }, 'team');
  const disabled = normalizeNotionProperty({ type: 'checkbox', checkbox: false }, 'team');

  assert.deepEqual(enabled, {
    notionType: 'checkbox',
    value: true,
    displayValue: 'true',
    sensitivity: 'team',
    isEmpty: false,
  });
  assert.equal(disabled.value, false);
  assert.equal(disabled.displayValue, 'false');
  assert.equal(disabled.isEmpty, false);
});

test('normalizes finite and invalid number properties distinctly', () => {
  const amount = normalizeNotionProperty({ type: 'number', number: 123.45 }, 'restricted');
  const zero = normalizeNotionProperty({ type: 'number', number: 0 }, 'restricted');
  const invalid = normalizeNotionProperty({ type: 'number', number: Number.NaN }, 'restricted');

  assert.equal(amount.notionType, 'number');
  assert.equal(amount.value, 123.45);
  assert.equal(amount.displayValue, '123.45');
  assert.equal(amount.isEmpty, false);
  assert.equal(zero.value, 0);
  assert.equal(zero.isEmpty, false);
  assert.equal(invalid.value, null);
  assert.equal(invalid.displayValue, '');
  assert.equal(invalid.isEmpty, true);
});

test('normalizes date properties with nullable end and time zone fields', () => {
  const date = normalizeNotionProperty({
    type: 'date',
    date: { start: '2026-09-10', end: null, time_zone: 'America/Los_Angeles' },
  }, 'team');
  const empty = normalizeNotionProperty({ type: 'date', date: null }, 'team');

  assert.deepEqual(date.value, {
    start: '2026-09-10',
    end: null,
    time_zone: 'America/Los_Angeles',
  });
  assert.equal(date.displayValue, '{"start":"2026-09-10","end":null,"time_zone":"America/Los_Angeles"}');
  assert.equal(date.isEmpty, false);
  assert.equal(empty.value, null);
  assert.equal(empty.isEmpty, true);
});

test('normalizes relation properties to stable Notion page IDs', () => {
  const relation = normalizeNotionProperty({
    type: 'relation',
    relation: [{ id: 'page-a' }, { id: 'page-b' }, { id: null }],
  }, 'team');
  const empty = normalizeNotionProperty({ type: 'relation', relation: [] }, 'team');

  assert.deepEqual(relation.value, ['page-a', 'page-b']);
  assert.equal(relation.displayValue, 'page-a, page-b');
  assert.equal(relation.isEmpty, false);
  assert.deepEqual(empty.value, []);
  assert.equal(empty.displayValue, '');
  assert.equal(empty.isEmpty, true);
});

test('identifies and unwraps v2 envelopes', () => {
  const envelope = normalizeNotionProperty({ type: 'number', number: 7 }, 'team');

  assert.equal(isNotionPropertyEnvelope(envelope), true);
  assert.equal(unwrapNotionProperty(envelope), 7);
  assert.equal(unwrapNotionProperty(false), false);
});

test('validates v2 envelopes and mirror records before persistence', () => {
  const validNumber = normalizeNotionProperty({ type: 'number', number: 12 }, 'team');
  assert.deepEqual(validateNotionPropertyEnvelope(validNumber), []);
  assert.equal(validateNotionPropertyEnvelope({ notionType: 'number', value: '12' }).length, 1);

  const validRecord = {
    recordSchemaVersion: 2 as const,
    source: 'flows',
    sourcePageId: 'page-1',
    sourceUrl: null,
    sourceLastEditedAt: null,
    archived: false,
    properties: { Capacity: validNumber },
  };
  assert.deepEqual(validateNotionMirrorRecord(validRecord), []);
  assert.equal(validateNotionMirrorRecord({ ...validRecord, recordSchemaVersion: 1 }).length, 1);
});
