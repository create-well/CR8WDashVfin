import { describe, expect, it } from 'vitest';
import { buildPropertyOptions, matchesTypedFilters, moneyAmountDisplay, propertyDisplayValue, recordLabel, sourceCollections, sourceFreshnessLabel } from '../NotionMirrorSummary';
import type { NotionMirrors } from '../../api';

const emptyMirrors: NotionMirrors = { people: [], flows: [], moves: [], content: [], money: [], engineeringDelivery: [] };

const registrySources = [
  { key: 'people', label: 'People', visible: true, searchable: true, sensitivity: 'team' as const, displayFields: ['Name'], recordCount: 13 },
  { key: 'money', label: 'Money', visible: true, searchable: true, sensitivity: 'restricted' as const, displayFields: ['Name', 'Amount'], recordCount: 2 },
];

const typedRecord = {
  source: 'engineeringDelivery' as const,
  sourcePageId: 'delivery-1',
  sourceUrl: null,
  sourceLastEditedAt: null,
  archived: false,
  properties: {
    Name: { type: 'title', value: 'Mirror rollout', displayValue: 'Mirror rollout' },
    Stage: { type: 'select', value: 'Review' },
    Surface: { type: 'multi_select', value: ['Data/Sync', 'API'] },
  },
};

describe('NotionMirrorSummary typed properties', () => {
  it('labels per-source freshness states without exposing backend error details', () => {
    expect(sourceFreshnessLabel({ source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: null, sourceFreshness: { money: { status: 'ok', recordCount: 2, sourceLastEditedAt: null, lastSuccessfulSyncAt: '2026-09-10T12:00:00.000Z' } } }, 'money')).toContain('Healthy · synced');
    expect(sourceFreshnessLabel({ source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: null, sourceFreshness: { money: { status: 'error', recordCount: 2, sourceLastEditedAt: null, lastSuccessfulSyncAt: '2026-09-10T11:00:00.000Z', error: 'secret backend detail' } } }, 'money')).toContain('Sync error · last good');
    expect(sourceFreshnessLabel({ source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: null }, 'money')).toBe('Status unavailable');
  });

  it('uses the value inside typed Notion properties for labels', () => {
    expect(recordLabel({
      source: 'money',
      sourcePageId: 'money-1',
      sourceUrl: null,
      sourceLastEditedAt: null,
      archived: false,
      properties: {
        Name: { type: 'title', value: '[DEV SAMPLE] Money income test', displayValue: '[DEV SAMPLE] Money income test', sensitivity: 'restricted' },
        Amount: { type: 'number', value: 123.45, displayValue: '123.45', sensitivity: 'restricted' },
      },
    })).toBe('[DEV SAMPLE] Money income test');
  });

  it('prefers registry display fields over Notion property order for labels', () => {
    // Notion returns properties in schema order; on real Money pages Amount
    // precedes Name, and the label must not become the amount.
    const amountFirst = {
      source: 'money' as const,
      sourcePageId: 'money-2',
      sourceUrl: null,
      sourceLastEditedAt: null,
      archived: false,
      properties: {
        Amount: { type: 'number', value: -67.89, displayValue: '-67.89', sensitivity: 'restricted' as const },
        Name: { type: 'title', value: '[DEV SAMPLE] Money expense test', displayValue: '[DEV SAMPLE] Money expense test', sensitivity: 'restricted' as const },
      },
    };
    expect(recordLabel(amountFirst, ['Name', 'Amount'])).toBe('[DEV SAMPLE] Money expense test');
    // Without registry metadata the Name/Title fallback still beats first-truthy.
    expect(recordLabel(amountFirst)).toBe('[DEV SAMPLE] Money expense test');
    // First display field with a resolvable value wins even when Name is empty.
    const noName = { ...amountFirst, properties: { ...amountFirst.properties, Name: { type: 'title', value: '', displayValue: '' } } };
    expect(recordLabel(noName, ['Name', 'Amount'])).toBe('-67.89');
  });

  it('carries registry display fields onto source collections', () => {
    const collections = sourceCollections(emptyMirrors, registrySources);
    expect(collections.find(collection => collection.key === 'money')?.displayFields).toEqual(['Name', 'Amount']);
    expect(collections.find(collection => collection.key === 'people')?.displayFields).toEqual(['Name']);
  });

  it.each([
    ['select', { type: 'select', value: 'Committed' }, 'Committed'],
    ['multi-select', { type: 'multi_select', value: ['Podcast', 'Substack'] }, 'Podcast, Substack'],
    ['date range', { type: 'date', value: { start: '2026-09-10', end: '2026-09-12', time_zone: null } }, '2026-09-10 – 2026-09-12'],
    ['relation', { type: 'relation', value: ['page-a', 'page-b'] }, 'page-a, page-b'],
    ['display fallback', { type: 'select', value: null, displayValue: 'Visible fallback' }, 'Visible fallback'],
  ])('normalizes %s values for display', (_label, value, expected) => {
    expect(propertyDisplayValue(value)).toBe(expected);
  });

  it('builds sorted typed-property options and deduplicates values', () => {
    const options = buildPropertyOptions([typedRecord, { ...typedRecord, sourcePageId: 'delivery-2', properties: { ...typedRecord.properties, Stage: { type: 'select', value: 'Verified' } } }]);
    expect(options.map(option => option.key)).toEqual(['Name', 'Stage', 'Surface']);
    expect(options.find(option => option.key === 'Stage')?.values).toEqual(['Review', 'Verified']);
  });

  it('matches search, property, and property-value filters against typed envelopes', () => {
    expect(matchesTypedFilters(typedRecord, 'rollout', 'Stage', 'all')).toBe(true);
    expect(matchesTypedFilters(typedRecord, '', 'Stage', 'Review')).toBe(true);
    expect(matchesTypedFilters(typedRecord, '', 'Stage', 'Blocked')).toBe(false);
    expect(matchesTypedFilters(typedRecord, '', 'Owner', 'all')).toBe(false);
  });

  it('labels unavailable and failed per-source freshness without hiding the reason', () => {
    expect(sourceFreshnessLabel({ source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: null }, 'money')).toBe('Status unavailable');
    expect(sourceFreshnessLabel({
      source: 'notion', mirrorUpdatedAt: null, sourceLastEditedAt: null, syncRunId: null,
      sourceFreshness: { money: { status: 'error', recordCount: 2, sourceLastEditedAt: null, lastSuccessfulSyncAt: null, error: 'timeout' } },
    }, 'money')).toBe('Sync error · no successful sync');
  });

  it('builds collections from server registry metadata in registry order', () => {
    const collections = sourceCollections(emptyMirrors, registrySources);
    expect(collections.map(collection => collection.key)).toEqual(['people', 'money']);
    expect(collections.map(collection => collection.label)).toEqual(['People', 'Money']);
  });

  it('hides sources the server marks invisible and skips unknown keys', () => {
    const collections = sourceCollections(emptyMirrors, [
      ...registrySources,
      { key: 'money', label: 'Duplicate hidden', visible: false, searchable: true, sensitivity: 'restricted' as const, displayFields: [], recordCount: 0 },
      { key: 'futureSource', label: 'Future', visible: true, searchable: true, sensitivity: 'team' as const, displayFields: [], recordCount: 0 },
    ]);
    expect(collections.map(collection => collection.key)).toEqual(['people', 'money']);
    expect(collections.filter(collection => collection.label === 'Duplicate hidden')).toHaveLength(0);
  });

  it('falls back to the static label table when no metadata has arrived', () => {
    expect(sourceCollections(emptyMirrors).map(collection => collection.key))
      .toEqual(['people', 'flows', 'moves', 'content', 'money', 'engineeringDelivery']);
    expect(sourceCollections(emptyMirrors, []).map(collection => collection.key))
      .toEqual(['people', 'flows', 'moves', 'content', 'money', 'engineeringDelivery']);
  });

  it('formats Money amounts from typed envelopes and plain numbers', () => {
    const typed = {
      source: 'money' as const, sourcePageId: 'm1', sourceUrl: null, sourceLastEditedAt: null, archived: false,
      properties: { Amount: { type: 'number', value: 123.45, displayValue: '123.45', sensitivity: 'restricted' as const } },
    };
    expect(moneyAmountDisplay(typed)).toBe('123.45');
    expect(moneyAmountDisplay({ ...typed, sourcePageId: 'm2', properties: { Amount: { type: 'number', value: -67.89 } } })).toBe('-67.89');
    expect(moneyAmountDisplay({ ...typed, sourcePageId: 'm3', properties: { Amount: 1000 } })).toBe('1,000');
  });

  it('returns no amount display for missing or non-finite Money values', () => {
    const base = { source: 'money' as const, sourcePageId: 'm1', sourceUrl: null, sourceLastEditedAt: null, archived: false, properties: {} };
    expect(moneyAmountDisplay(base)).toBeNull();
    expect(moneyAmountDisplay({ ...base, properties: { Amount: { type: 'number', value: null } } })).toBeNull();
    expect(moneyAmountDisplay({ ...base, properties: { Amount: { type: 'number', value: 'oops' } } })).toBeNull();
  });
});
