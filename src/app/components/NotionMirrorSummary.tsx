import React, { useMemo, useState } from 'react';
import type { NotionMirrorRecord, NotionMirrors } from './api';
import type { SyncFreshness } from '../../types/dashboard';

type MirrorKey = keyof NotionMirrors;
type FilterKey = 'all' | MirrorKey;

const LABELS: Record<MirrorKey, string> = {
  people: 'People',
  flows: 'Flows',
  moves: 'Moves',
  content: 'Content',
  money: 'Money',
  engineeringDelivery: 'Engineering Delivery',
};

export interface TypedPropertyFilterOption {
  key: string;
  label: string;
  values: string[];
}

export function propertyDisplayValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value.map(propertyDisplayValue).filter((item): item is string => Boolean(item));
    return items.length > 0 ? items.join(', ') : null;
  }
  if (!value || typeof value !== 'object') return null;

  const objectValue = value as Record<string, unknown>;
  // Typed mirror envelopes retain the Notion property type around the normalized value.
  if ('value' in objectValue) {
    const normalized = propertyDisplayValue(objectValue.value);
    if (normalized) return normalized;
    return propertyDisplayValue(objectValue.displayValue);
  }
  if (typeof objectValue.name === 'string') return objectValue.name.trim() || null;
  if (typeof objectValue.plain_text === 'string') return objectValue.plain_text.trim() || null;
  if (typeof objectValue.content === 'string') return objectValue.content.trim() || null;
  if (typeof objectValue.id === 'string') return objectValue.id;

  // Date values are normalized as { start, end, time_zone } by the sync worker.
  const start = propertyDisplayValue(objectValue.start);
  const end = propertyDisplayValue(objectValue.end);
  if (start) return end && end !== start ? `${start} – ${end}` : start;
  return null;
}

export function recordLabel(record: NotionMirrorRecord): string {
  const first = Object.values(record.properties ?? {}).map(propertyDisplayValue).find(Boolean);
  return first ?? 'Untitled record';
}

function recordSearchText(record: NotionMirrorRecord): string {
  return [record.source, record.sourcePageId, recordLabel(record), JSON.stringify(record.properties)].join(' ').toLowerCase();
}

export function buildPropertyOptions(records: NotionMirrorRecord[]): TypedPropertyFilterOption[] {
  const values = new Map<string, Set<string>>();
  records.forEach(record => Object.entries(record.properties ?? {}).forEach(([key, rawValue]) => {
    const display = propertyDisplayValue(rawValue);
    if (!display) return;
    const bucket = values.get(key) ?? new Set<string>();
    bucket.add(display);
    values.set(key, bucket);
  }));
  return [...values.entries()]
    .map(([key, entries]) => ({ key, label: key, values: [...entries].sort() }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function matchesTypedFilters(record: NotionMirrorRecord, search: string, property: string, propertyValue: string, indexedSearchText?: string): boolean {
  const query = search.trim().toLowerCase();
  if (query && !(indexedSearchText ?? recordSearchText(record)).includes(query)) return false;
  if (property !== 'all' && propertyDisplayValue(record.properties?.[property]) === null) return false;
  return propertyValue === 'all' || propertyDisplayValue(record.properties?.[property]) === propertyValue;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'not available';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'not available';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotionMirrorSummaryProps {
  mirrors: NotionMirrors;
  freshness: SyncFreshness;
}

export function NotionMirrorSummary({ mirrors, freshness }: NotionMirrorSummaryProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [property, setProperty] = useState('all');
  const [propertyValue, setPropertyValue] = useState('all');
  const collections = useMemo(() => (Object.keys(LABELS) as MirrorKey[]).map((key) => ({
    key,
    label: LABELS[key],
    records: mirrors[key] ?? [],
  })), [mirrors.people, mirrors.flows, mirrors.moves, mirrors.content, mirrors.money, mirrors.engineeringDelivery]);
  const indexedRecords = useMemo(() => collections.flatMap(({ key, label, records }) => records.map(record => ({
    key,
    label,
    record,
    searchText: recordSearchText(record),
  }))), [collections]);
  const propertyOptions = useMemo(() => buildPropertyOptions(collections.flatMap(collection => collection.records)), [collections]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return indexedRecords
      .filter(({ key }) => filter === 'all' || filter === key)
      .filter(({ record, searchText }) => matchesTypedFilters(record, query, property, propertyValue, searchText));
  }, [filter, indexedRecords, property, propertyValue, search]);

  return (
    <section
      aria-labelledby="notion-mirror-heading"
      style={{
        margin: '18px 0 4px',
        padding: '16px 18px',
        border: '1px solid var(--border-soft, rgba(196,164,132,0.18))',
        borderRadius: 14,
        background: 'var(--surface-raised, rgba(255,255,255,0.38))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted, #6B5F7A)' }}>
            Notion mirror
          </div>
          <h2 id="notion-mirror-heading" style={{ margin: '3px 0 0', fontSize: '1.05rem', fontWeight: 600 }}>
            Team source, visible here
          </h2>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #6B5F7A)' }}>
          {freshness.source === 'notion' ? `Updated ${relativeTime(freshness.mirrorUpdatedAt)}` : 'Awaiting Notion sync'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {collections.map(({ key, label, records }) => (
          <button
            type="button"
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            aria-pressed={filter === key}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, border: filter === key ? '1px solid rgba(116, 94, 151, 0.45)' : '1px solid transparent', background: filter === key ? 'rgba(116, 94, 151, 0.16)' : 'rgba(116, 94, 151, 0.08)', color: 'var(--text-muted, #6B5F7A)', fontSize: '0.73rem', cursor: 'pointer' }}
          >
            <strong style={{ color: 'var(--text, #2D2438)' }}>{records.length}</strong> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Search synchronized records</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search typed properties…"
            type="search"
            style={{ boxSizing: 'border-box', width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}
          />
        </label>
        <select value={filter} onChange={event => setFilter(event.target.value as FilterKey)} aria-label="Filter synchronized records by source" style={{ minWidth: 130, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}>
          <option value="all">All sources</option>
          {(Object.keys(LABELS) as MirrorKey[]).map(key => <option key={key} value={key}>{LABELS[key]}</option>)}
        </select>
        <select value={property} onChange={event => { setProperty(event.target.value); setPropertyValue('all'); }} aria-label="Filter synchronized records by property" style={{ minWidth: 150, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}>
          <option value="all">All properties</option>
          {propertyOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        {property !== 'all' && (
          <select value={propertyValue} onChange={event => setPropertyValue(event.target.value)} aria-label={`Filter ${property} values`} style={{ minWidth: 150, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}>
            <option value="all">All {property}</option>
            {(propertyOptions.find(option => option.key === property)?.values ?? []).map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        )}
      </div>

      {filteredRecords.length > 0 ? (
        <>
          <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--text-muted, #6B5F7A)' }}>
            Showing {Math.min(filteredRecords.length, 12)} of {filteredRecords.length} matching records
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginTop: 8 }}>
            {filteredRecords.slice(0, 12).map(({ key, label, record }) => (
              <a
                key={`${key}-${record.sourcePageId}`}
                href={record.sourceUrl ?? undefined}
                target={record.sourceUrl ? '_blank' : undefined}
                rel={record.sourceUrl ? 'noreferrer' : undefined}
                style={{ minWidth: 0, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border-soft, rgba(196,164,132,0.14))', color: 'inherit', textDecoration: 'none' }}
              >
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted, #6B5F7A)' }}>{label}</div>
                <div style={{ marginTop: 4, fontSize: '0.78rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recordLabel(record)}</div>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted, #6B5F7A)' }}>
          {search || filter !== 'all' || property !== 'all' || propertyValue !== 'all' ? 'No synchronized records match these filters.' : 'The mirror is connected. No records are available to show yet.'}
        </div>
      )}
    </section>
  );
}
