import React from 'react';
import type { NotionMirrorRecord, NotionMirrors } from './api';
import type { SyncFreshness } from '../../types/dashboard';

type MirrorKey = keyof NotionMirrors;

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

function relativeTime(iso: string | null): string {
  if (!iso) return 'not available';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
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
  const collections = (Object.keys(LABELS) as MirrorKey[]).map((key) => ({
    key,
    label: LABELS[key],
    records: mirrors[key] ?? [],
  }));
  const featured = collections
    .filter(({ records }) => records.length > 0)
    .flatMap(({ key, label, records }) => records.slice(0, key === 'people' ? 2 : 1).map((record) => ({ key, label, record })))
    .slice(0, 5);

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
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, background: 'rgba(116, 94, 151, 0.08)', color: 'var(--text-muted, #6B5F7A)', fontSize: '0.73rem' }}>
            <strong style={{ color: 'var(--text, #2D2438)' }}>{records.length}</strong> {label}
          </div>
        ))}
      </div>

      {featured.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginTop: 14 }}>
          {featured.map(({ key, label, record }) => (
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
      ) : (
        <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted, #6B5F7A)' }}>
          The mirror is connected. No records are available to show yet.
        </div>
      )}
    </section>
  );
}
