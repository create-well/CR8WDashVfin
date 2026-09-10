import React, { useState } from 'react';
import { Clock, MapPin, Users, Plus, Edit3, ExternalLink, X } from 'lucide-react';
import type { CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import {
  cardStyle, labelStyle, inputStyle, btnPrimary, btnSecondary,
  getCountdown, formatD8, getTimeDisplay, PERSON_KEYS
} from '../utils';

export function DateCard({ d8, onUpdate, onDelete, onEdit }: {
  d8: CoFlowDate;
  onUpdate: (id: number, u: Partial<CoFlowDate>) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
}) {
  const countdown = getCountdown(d8.date);
  const [showInlineAgenda, setShowInlineAgenda] = useState(false);
  const [inlineItem, setInlineItem] = useState('');

  function addInlineAgendaItem() {
    if (!inlineItem.trim()) return;
    const item = { id: Date.now(), text: inlineItem.trim(), lead: 'monny', timeEstimate: 10, done: false };
    onUpdate(d8.id, { agendaItems: [...(d8.agendaItems || []), item] });
    setInlineItem('');
  }

  function handleAddToCalendar() {
    const start = d8.date.replace(/-/g, '');
    const title = encodeURIComponent(`behind h0es doors${d8.theme ? ` \u2014 ${d8.theme}` : ''}`);
    const loc = encodeURIComponent(d8.location || '');
    const details = encodeURIComponent(`Host: ${d8.host ? PERSONS[d8.host]?.name || d8.host : 'TBD'}\nTheme: ${d8.theme || 'TBD'}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${start}&location=${loc}&details=${details}`;
    window.open(url, '_blank');
  }

  const statusColors: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
    yes: { bg: 'rgba(107,175,107,0.12)', border: '#6BAF6B', label: 'Going', emoji: '✅' },
    no: { bg: 'rgba(212,107,107,0.12)', border: '#D46B6B', label: "Can't make it", emoji: '❌' },
    maybe: { bg: 'rgba(212,167,113,0.12)', border: '#D4A771', label: 'Maybe', emoji: '🤔' },
    pending: { bg: 'var(--sandstone)', border: 'var(--border-soft)', label: 'Pending', emoji: '⏳' },
  };

  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
      {/* Top gradient bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--cr8w-primary), var(--camel-sun))' }} />

      {/* Countdown badge */}
      <div style={{
        position: 'absolute', top: 14, right: 16,
        padding: '4px 12px', borderRadius: 20,
        background: countdown.urgent ? 'var(--cr8w-primary)' : 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)',
        color: countdown.urgent ? '#fff' : 'var(--cr8w-primary)',
        fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {countdown.label}
      </div>

      {/* Main info */}
      <div style={{ marginBottom: 20, paddingRight: 120 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>
          {formatD8(d8.date)}
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> {getTimeDisplay(d8)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={14} /> {d8.location || 'TBD'}
          </span>
          {d8.host && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={14} /> {PERSONS[d8.host]?.emoji} {PERSONS[d8.host]?.name || d8.host}
            </span>
          )}
        </div>
        {d8.theme && (
          <div style={{
            marginTop: 10, padding: '6px 14px', borderRadius: 'var(--cr-radius-sm)',
            background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)', border: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)',
            fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--cr8w-primary)',
            display: 'inline-block',
          }}>
            ✨ {d8.theme}
          </div>
        )}
      </div>

      {/* RSVP Status */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>RSVP Status</span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PERSON_KEYS.map(key => {
            const person = PERSONS[key];
            const status = d8.rsvp?.[key] || 'pending';
            const sc = statusColors[status];
            return (
              <div key={key} style={{
                flex: '1 1 140px', padding: '12px', borderRadius: 'var(--cr-radius-sm)',
                background: sc.bg, border: `1.5px solid ${sc.border}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: '1.4rem' }}>{person.emoji}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{person.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['yes', 'maybe', 'no'] as const).map(s => (
                    <button key={s} onClick={() => {
                      onUpdate(d8.id, { rsvp: { ...(d8.rsvp || {}), [key]: s } });
                    }} style={{
                      padding: '3px 8px', borderRadius: 10, fontSize: '0.62rem',
                      fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.3px',
                      background: status === s ? sc.border : 'transparent',
                      color: status === s ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${status === s ? sc.border : 'var(--border-soft)'}`,
                    }}>
                      {s === 'yes' ? 'going' : s === 'maybe' ? 'maybe' : "can't"}
                    </button>
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {sc.emoji} {sc.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Agenda Preview */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={labelStyle}>Agenda ({(d8.agendaItems || []).length} items)</span>
          <button onClick={() => setShowInlineAgenda(!showInlineAgenda)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: 'var(--cr8w-primary)',
            textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600,
          }}>
            {showInlineAgenda ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {showInlineAgenda && (
          <div style={{ animation: 'cw-fadeInUp 0.2s ease' }}>
            {(d8.agendaItems || []).map((item, i) => {
              const lead = PERSONS[item.lead];
              return (
                <div key={item.id} style={{
                  display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0',
                  borderBottom: i < (d8.agendaItems || []).length - 1 ? '1px solid var(--border-soft)' : 'none',
                  fontSize: '0.82rem', color: 'var(--text-secondary)',
                }}>
                  <span style={{ color: item.done ? '#6BAF6B' : 'var(--text-muted)', flexShrink: 0 }}>{item.done ? '✓' : '○'}</span>
                  <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.6 : 1 }}>{item.text}</span>
                  <span style={{ fontSize: '0.68rem', color: lead?.color || 'var(--text-muted)' }}>{lead?.emoji}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>~{item.timeEstimate}m</span>
                </div>
              );
            })}
            {(d8.agendaItems || []).length === 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>No agenda items yet</div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                value={inlineItem}
                onChange={e => setInlineItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addInlineAgendaItem(); }}
                placeholder="Quick add agenda item..."
                style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
              />
              <button onClick={addInlineAgendaItem} style={{ ...btnPrimary, padding: '6px 12px', fontSize: '0.72rem' }}>
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
        <button onClick={onEdit} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Edit3 size={13} /> Edit D8
        </button>
        <button onClick={handleAddToCalendar} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ExternalLink size={13} /> Add to Calendar
        </button>
        <button onClick={() => { if (confirm('Cancel this d8? It will be deleted.')) onDelete(d8.id); }} style={{
          ...btnSecondary, display: 'flex', alignItems: 'center', gap: 5, color: '#D46B6B', borderColor: 'rgba(212,107,107,0.3)',
        }}>
          <X size={13} /> Cancel D8
        </button>
      </div>

      {/* Vibe check display */}
      {d8.vibeCheck && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--cr-radius-sm)', background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)', border: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)', marginTop: 14 }}>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--cr8w-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Vibe Check</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{d8.vibeCheck}</p>
        </div>
      )}
    </div>
  );
}
