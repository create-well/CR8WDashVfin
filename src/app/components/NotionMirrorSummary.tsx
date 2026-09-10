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
};

function recordLabel(record: NotionMirrorRecord): string {
  const values = Object.values(record.properties ?? {}).filter((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
  const first = values[0];
  if (typeof first === 'string') return first;
  if (Array.isArray(first)) return first.join(', ');
  return 'Untitled record';
}

function recordSearchText(record: NotionMirrorRecord): string {
  return [record.source, record.sourcePageId, recordLabel(record), JSON.stringify(record.properties)].join(' ').toLowerCase();
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
  const collections = (Object.keys(LABELS) as MirrorKey[]).map((key) => ({
    key,
    label: LABELS[key],
    records: mirrors[key] ?? [],
  }));
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return collections
      .filter(({ key }) => filter === 'all' || filter === key)
      .flatMap(({ key, label, records }) => records.map((record) => ({ key, label, record })))
      .filter(({ record }) => !query || recordSearchText(record).includes(query));
  }, [collections, filter, search]);

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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people, flows, moves…"
            type="search"
            style={{ boxSizing: 'border-box', width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}
          />
        </label>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterKey)}
          aria-label="Filter synchronized records by source"
          style={{ minWidth: 130, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-soft, rgba(196,164,132,0.2))', background: 'rgba(255,255,255,0.45)', color: 'inherit', font: 'inherit', fontSize: '0.76rem' }}
        >
          <option value="all">All sources</option>
          {(Object.keys(LABELS) as MirrorKey[]).map((key) => <option key={key} value={key}>{LABELS[key]}</option>)}
        </select>
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
          {search || filter !== 'all' ? 'No synchronized records match this search.' : 'The mirror is connected. No records are available to show yet.'}
        </div>
      )}
    </section>
  );
}
