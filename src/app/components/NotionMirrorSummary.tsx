import React, { useMemo, useState } from 'react';
import type { NotionMirrorRecord, NotionMirrors, NotionPropertyValue, NotionSourceMetadata } from './api';
import type { SyncFreshness } from '../../types/dashboard';

type FilterKey = 'all' | string;

function fallbackSources(mirrors: NotionMirrors): NotionSourceMetadata[] {
  return Object.keys(mirrors).map((key) => {
    const sensitivity: NotionSourceMetadata['sensitivity'] = key === 'money' ? 'restricted' : 'team';
    return {
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    visible: true,
    searchable: true,
    sensitivity,
    displayFields: key === 'money' ? ['Name', 'Amount'] : ['Name', 'Status', 'Owner'],
    recordCount: mirrors[key as keyof NotionMirrors]?.length ?? 0,
    };
  });
}

function unwrap(value: unknown): unknown {
  if (value && typeof value === 'object' && 'value' in value && 'type' in value) return (value as NotionPropertyValue).value;
  return value;
}

function displayValue(value: unknown): string {
  const unwrapped = unwrap(value);
  if (unwrapped == null) return '';
  if (Array.isArray(unwrapped)) return unwrapped.map(displayValue).filter(Boolean).join(', ');
  if (typeof unwrapped === 'object') return JSON.stringify(unwrapped);
  return String(unwrapped);
}

function recordLabel(record: NotionMirrorRecord, fields: string[]): string {
  for (const field of fields) {
    const value = displayValue(record.properties?.[field]);
    if (value.trim()) return value;
  }
  for (const value of Object.values(record.properties ?? {})) {
    const text = displayValue(value);
    if (text.trim()) return text;
  }
  return 'Untitled record';
}

function recordSearchText(record: NotionMirrorRecord, fields: string[]): string {
  return [record.source, record.sourcePageId, ...fields.map((field) => displayValue(record.properties?.[field])), JSON.stringify(record.properties)].join(' ').toLowerCase();
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

function formatAmount(value: unknown): string | null {
  const unwrapped = unwrap(value);
  if (typeof unwrapped !== 'number' || !Number.isFinite(unwrapped)) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(unwrapped);
}

interface NotionMirrorSummaryProps {
  mirrors: NotionMirrors;
  freshness: SyncFreshness;
  sources?: NotionSourceMetadata[];
}

export function NotionMirrorSummary({ mirrors, freshness, sources }: NotionMirrorSummaryProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const collections = useMemo(() => (sources ?? fallbackSources(mirrors)).filter((source) => source.visible).map((source) => ({
    ...source,
    records: mirrors[source.key as keyof NotionMirrors] ?? [],
  })), [mirrors, sources]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return collections
      .filter(({ key }) => filter === 'all' || filter === key)
      .flatMap(({ key, label, searchable, displayFields, records }) => records.map((record) => ({ key, label, searchable, displayFields, record })))
      .filter(({ searchable, displayFields, record }) => !query || (searchable && recordSearchText(record, displayFields).includes(query)));
  }, [collections, filter, search]);

  return (
    <section aria-labelledby="notion-mirror-heading" style={{ margin: '18px 0 4px', padding: '16px 18px', border: '1px solid var(--border-soft, rgba(196,164,132,0.18))', borderRadius: 14, background: 'var(--surface-raised, rgba(255,255,255,0.38))' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted, #6B5F7A)' }}>Notion mirror</div>
          <h2 id="notion-mirror-heading" style={{ margin: '3px 0 0', fontSize: '1.05rem', fontWeight: 600 }}>Team source, visible here</h2>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #6B5F7A)' }}>{freshness.source === 'notion' ? `Updated ${relativeTime(freshness.mirrorUpdatedAt)}` : 'Awaiting Notion sync'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {collections.map(({ key, label, records }) => (
          <button type="button" key={key} onClick={() => setFilter(filter === key ? 'all' : key)} aria-pressed={filter === key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, border: filter === key ? '1px solid rgba(116, 94, 151, 0.45)' : '1px solid transparent', background: filter === key ? 'rgba(116, 94, 151, 0.16)' : 'rgba(116, 94, 151, 0.08)', color: 'var(--text-muted, #6B5F7A)', fontSize: '0.73rem', cursor: 'pointer' }}>
            <strong style={{ color: 'var(--text, #2D2438)' }}>{records.length}</strong> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Search synchronized records</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search synchronized records…" type="search" style={{ boxSizing: 'border-box', width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }} />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter synchronized records by source" style={{ minWidth: 130, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}>
          <option value="all">All sources</option>
          {collections.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {filteredRecords.length > 0 ? (
        <>
          <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--text-muted, #6B5F7A)' }}>Showing {Math.min(filteredRecords.length, 12)} of {filteredRecords.length} matching records</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginTop: 8 }}>
            {filteredRecords.slice(0, 12).map(({ key, label, displayFields, record }) => {
              const amount = key === 'money' ? formatAmount(record.properties?.Amount) : null;
              return (
                <a key={`${key}-${record.sourcePageId}`} href={record.sourceUrl ?? undefined} target={record.sourceUrl ? '_blank' : undefined} rel={record.sourceUrl ? 'noreferrer' : undefined} style={{ minWidth: 0, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border-soft, rgba(196,164,132,0.14))', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted, #6B5F7A)' }}>{label}</div>
                  <div style={{ marginTop: 4, fontSize: '0.78rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recordLabel(record, displayFields)}</div>
                  {amount ? <div style={{ marginTop: 5, fontSize: '0.86rem', fontWeight: 600 }}>{amount}</div> : null}
                </a>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted, #6B5F7A)' }}>{search || filter !== 'all' ? 'No synchronized records match this search.' : 'The mirror is connected. No records are available to show yet.'}</div>
      )}
    </section>
  );
}
