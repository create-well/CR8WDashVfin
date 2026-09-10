import React from 'react';
import { X, Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import type { Workshop } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';

interface WorkshopCardProps {
  workshop: Workshop;
  onDragStart: () => void;
  onDelete: () => void;
}

export function WorkshopCard({ workshop: w, onDragStart, onDelete }: WorkshopCardProps) {
  const person = PERSONS[w.facilitator];
  const dateStr = w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--cr-radius-md)',
        padding: 14,
        marginBottom: 10,
        boxShadow: 'var(--shadow-sm)',
        cursor: 'grab',
        border: `1px solid var(--border-soft)`,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {/* Title + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600,
          color: 'var(--text-primary)', lineHeight: 1.3,
        }}>
          {w.title}
        </span>
        <button onClick={onDelete} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--text-muted)', opacity: 0.5,
        }} title="Delete">
          <X size={13} />
        </button>
      </div>

      {/* Facilitator badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px', borderRadius: 10,
        background: `${person?.color || '#ccc'}22`,
        marginBottom: 8,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: person?.color || '#ccc' }} />
        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          {person?.name || w.facilitator}
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {dateStr && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={11} /> {dateStr}
          </span>
        )}
        {w.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={11} /> {w.location}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Users size={11} /> {w.participants}/{w.capacity}
        </span>
      </div>

      {/* Tags */}
      {w.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {w.tags.map((tag, i) => (
            <span key={i} style={{
              padding: '1px 7px', borderRadius: 8,
              background: 'var(--sandstone)', color: 'var(--text-muted)',
              fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Google Doc link */}
      {w.googleDocLink && (
        <a
          href={w.googleDocLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 8, fontSize: '0.72rem', color: 'var(--cr8w-primary)',
            fontFamily: 'var(--font-label)', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={11} /> Google Doc
        </a>
      )}
    </div>
  );
}
