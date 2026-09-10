import { describe, expect, it } from 'vitest';
import { normalizeNotionProperty } from '../notion-property-envelope';

describe('typed Notion property envelope', () => {
  it('normalizes numeric values and preserves restricted sensitivity', () => {
    expect(normalizeNotionProperty('Amount', { type: 'number', number: 123.45 }, 'restricted')).toEqual({
      type: 'number',
      value: 123.45,
      displayValue: '123.45',
      sensitivity: 'restricted',
      sourceProperty: 'Amount',
    });
  });

  it('normalizes invalid numbers to null with a warning', () => {
    expect(normalizeNotionProperty('Amount', { type: 'number', number: Number.NaN })).toMatchObject({
      type: 'number',
      value: null,
      warnings: ['Invalid number normalized to null'],
    });
  });

  it('normalizes checkbox, select, status, and multi-select properties', () => {
    expect(normalizeNotionProperty('Final?', { type: 'checkbox', checkbox: true }).value).toBe(true);
    expect(normalizeNotionProperty('Stage', { type: 'status', status: { name: 'Blocked' } }).value).toBe('Blocked');
    expect(normalizeNotionProperty('Direction', { type: 'select', select: { name: 'In' } }).value).toBe('In');
    expect(normalizeNotionProperty('Surface', { type: 'multi_select', multi_select: [{ name: 'Data/Sync' }, { name: 'Platform' }] }).value).toEqual(['Data/Sync', 'Platform']);
  });

  it('normalizes title and rich text into plain text', () => {
    expect(normalizeNotionProperty('Name', {
      type: 'title',
      title: [{ plain_text: 'Engineering Delivery' }],
    }).value).toBe('Engineering Delivery');
    expect(normalizeNotionProperty('Blocked By', {
      type: 'rich_text',
      rich_text: [{ text: { content: 'Needs authorization' } }],
    }).value).toBe('Needs authorization');
  });

  it('preserves date ranges and expanded date semantics', () => {
    expect(normalizeNotionProperty('Target', {
      type: 'date',
      date: { start: '2026-09-12', end: '2026-09-14', time_zone: null },
    })).toMatchObject({
      type: 'date',
      value: { start: '2026-09-12', end: '2026-09-14', time_zone: null },
      displayValue: '2026-09-12',
    });
  });

  it('normalizes relations and people to stable IDs without exposing extra fields', () => {
    expect(normalizeNotionProperty('Owner', {
      type: 'people',
      people: [{ id: 'user-1', name: 'Private Name', url: 'https://notion.so/user-1' }],
    }).value).toEqual([{ id: 'user-1', url: 'https://notion.so/user-1' }]);
    expect(normalizeNotionProperty('Flow', {
      type: 'relation',
      relation: [{ id: 'flow-1', url: null }],
    }).value).toEqual([{ id: 'flow-1', url: null }]);
  });

  it('normalizes unique IDs, URLs, and formula results', () => {
    expect(normalizeNotionProperty('ID', { type: 'unique_id', unique_id: { prefix: 'ENG-', number: 7 } }).value).toBe('ENG-7');
    expect(normalizeNotionProperty('GitHub PR', { type: 'url', url: 'https://github.com/create-well/CR8WDashVfin/pull/7' }).value).toBe('https://github.com/create-well/CR8WDashVfin/pull/7');
    expect(normalizeNotionProperty('Score', { type: 'formula', formula: { type: 'number', number: 4 } }).value).toEqual({ type: 'number', value: 4 });
  });

  it('fails visibly but safely for unsupported properties', () => {
    expect(normalizeNotionProperty('Unknown', { type: 'unsupported_type', unsupported_type: { raw: true } })).toMatchObject({
      type: 'unknown',
      value: { raw: true },
      warnings: ['Unsupported Notion property type: unsupported_type'],
    });
  });
});
