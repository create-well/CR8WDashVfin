import { describe, expect, it } from 'vitest';
import { buildPropertyOptions, matchesTypedFilters, propertyDisplayValue, recordLabel, sourceFreshnessLabel } from '../NotionMirrorSummary';

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
});
