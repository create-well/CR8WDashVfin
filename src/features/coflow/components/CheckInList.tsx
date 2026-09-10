import React from 'react';
import { Plus, X } from 'lucide-react';
import type { CoFlowCheckin, CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { cardStyle, labelStyle, btnPrimary, PERSON_KEYS, MOOD_OPTIONS } from '../utils';
import { CheckInForm } from './CheckInForm';
import { formatTimestamp } from '@/app/components/data';

export function CheckInList({ coflowCheckins, weekCheckins, checkedInPersons, showForm, setShowForm, onAddCheckin, onDeleteCheckin, nextD8 }: {
  coflowCheckins: CoFlowCheckin[];
  weekCheckins: CoFlowCheckin[];
  checkedInPersons: Set<string>;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onAddCheckin: (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => void;
  onDeleteCheckin: (id: number) => void;
  nextD8?: CoFlowDate;
}) {
  const moodLookup: Record<string, { emoji: string; label: string; color: string }> = {};
  MOOD_OPTIONS.forEach(m => { moodLookup[m.key] = m; });

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        ...cardStyle, marginBottom: 16, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(var(--cr8w-primary-rgb, 123,168,157),0.06), rgba(var(--cr8w-secondary-rgb, 184,169,212),0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {checkedInPersons.size}/3 checked in this week
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {PERSON_KEYS.map(key => {
              const p = PERSONS[key];
              const done = checkedInPersons.has(key);
              return (
                <span key={key} style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                  background: done ? `${p.color}22` : 'var(--bg-elevated)',
                  border: `2px solid ${done ? p.color : 'var(--border-soft)'}`,
                  opacity: done ? 1 : 0.4,
                }} title={`${p.name} ${done ? '✓' : 'pending'}`}>
                  {p.emoji}
                </span>
              );
            })}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '8px 16px', fontSize: '0.8rem', flexShrink: 0,
        }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Check In'}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={labelStyle}>Weekly Co-Flow Check</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          Drop your check-in before the next behind h0es doors. Share your vibe, confirm time, suggest a spot, add agenda items.
        </p>
      </div>

      {showForm && (
        <CheckInForm onSubmit={(c) => { onAddCheckin(c); setShowForm(false); }} nextD8={nextD8} />
      )}

      {coflowCheckins.length === 0 && !showForm && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            No check-ins yet this week. Be the first to drop your vibe.
          </div>
        </div>
      )}

      {[...coflowCheckins].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map(ci => {
        const p = PERSONS[ci.author];
        const mood = ci.mood ? moodLookup[ci.mood] : null;
        return (
          <div key={ci.id} style={{ ...cardStyle, marginBottom: 10, borderLeft: `3px solid ${p?.color || 'var(--cr8w-primary)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>{p?.emoji || '🌀'}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p?.name || ci.author}</span>
                {mood && (
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem',
                    fontFamily: 'var(--font-label)', fontWeight: 600,
                    background: `${mood.color}18`, color: mood.color,
                    border: `1px solid ${mood.color}33`,
                  }}>
                    {mood.emoji} {mood.label}
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{formatTimestamp(ci.created_at)}</span>
              </div>
              <button onClick={() => onDeleteCheckin(ci.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4 }}><X size={13} /></button>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, flexWrap: 'wrap' }}>
              <span>{ci.confirmTime ? '✅ Time works' : '❓ Time TBD'}</span>
              {ci.timePreference && <span>🕒 Prefers: {ci.timePreference}</span>}
              {ci.locationSuggestion && <span>📍 {ci.locationSuggestion}</span>}
            </div>
            {ci.notes && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, padding: '8px 12px', borderRadius: 'var(--cr-radius-sm)', background: 'rgba(0,0,0,0.03)', lineHeight: 1.5, fontStyle: 'italic' }}>
                {ci.notes}
              </div>
            )}
            {ci.agendaItems?.length > 0 && (
              <div>
                <span style={{ ...labelStyle, marginBottom: 4 }}>Agenda Items</span>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ci.agendaItems.map((item, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 2, lineHeight: 1.5 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
