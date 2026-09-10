import React from 'react';
import { MapPin, Clock, Users, ChevronUp, ChevronDown } from 'lucide-react';
import type { CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { cardStyle, labelStyle, formatD8, getTimeDisplay, inputStyle } from '../utils';

export function ArchivedDates({ archivedD8s, expandedArchive, setExpandedArchive, onUpdateD8 }: {
  archivedD8s: CoFlowDate[];
  expandedArchive: number | null;
  setExpandedArchive: (v: number | null) => void;
  onUpdateD8: (id: number, u: Partial<CoFlowDate>) => void;
}) {
  return (
    <div>
      <span style={labelStyle}>Past behind h0es doors</span>
      {archivedD8s.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📚</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            No archived sessions yet. Past d8s will appear here after they wrap.
          </div>
        </div>
      )}
      {archivedD8s.map(d8 => {
        const isExpanded = expandedArchive === d8.id;
        const attendees = Object.entries(d8.rsvp || {}).filter(([_, s]) => s === 'yes').map(([k]) => PERSONS[k]);
        const agendaDone = (d8.agendaItems || []).filter(i => i.done).length;
        const agendaTotal = (d8.agendaItems || []).length;
        return (
          <div key={d8.id} style={{ ...cardStyle, marginBottom: 12, overflow: 'hidden', borderLeft: `3px solid var(--cr8w-primary)` }}>
            <div onClick={() => setExpandedArchive(isExpanded ? null : d8.id)} style={{ cursor: 'pointer' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{formatD8(d8.date)}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={12} /> {d8.location || 'No location'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {getTimeDisplay(d8)}</span>
                    {d8.host && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={12} /> {PERSONS[d8.host]?.name || d8.host}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {attendees.map((a, i) => a && <span key={i} title={a.name} style={{ fontSize: '1rem' }}>{a.emoji}</span>)}
                    {attendees.length === 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No RSVPs</span>}
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Summary badges */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {d8.theme && (
                  <span style={{ padding: '2px 10px', borderRadius: 10, background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)', color: 'var(--cr8w-primary)', fontFamily: 'var(--font-label)', fontSize: '0.65rem', fontWeight: 600 }}>
                    ✨ {d8.theme}
                  </span>
                )}
                {agendaTotal > 0 && (
                  <span style={{ padding: '2px 10px', borderRadius: 10, background: 'rgba(107,175,107,0.08)', color: '#5A9A5A', fontFamily: 'var(--font-label)', fontSize: '0.65rem', fontWeight: 600 }}>
                    {agendaDone}/{agendaTotal} agenda items done
                  </span>
                )}
                <span style={{ padding: '2px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontFamily: 'var(--font-label)', fontSize: '0.65rem', fontWeight: 600 }}>
                  {attendees.length} attended
                </span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
                {/* Agenda recap */}
                {agendaTotal > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={labelStyle}>Agenda Items</span>
                    {(d8.agendaItems || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: item.done ? '#6BAF6B' : 'var(--text-muted)' }}>{item.done ? '✓' : '○'}</span>
                        <span style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.6 : 1, flex: 1 }}>{item.text}</span>
                        {item.lead && <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: PERSONS[item.lead]?.color || 'var(--text-muted)' }}>{PERSONS[item.lead]?.emoji} {PERSONS[item.lead]?.name || item.lead}</span>}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>~{item.timeEstimate}m</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meeting notes */}
                {d8.notes && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={labelStyle}>Meeting Notes</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d8.notes}</p>
                  </div>
                )}

                {/* Session Notes (post-BHD reflection) */}
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Session Notes</span>
                  <textarea
                    value={d8.sessionNotes || ''}
                    onChange={e => onUpdateD8(d8.id, { sessionNotes: e.target.value })}
                    placeholder="Reflect on the session — what worked, what to carry forward..."
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                  />
                </div>

                {/* Vibe check */}
                {d8.vibeCheck && (
                  <div style={{ padding: '8px 12px', borderRadius: 'var(--cr-radius-sm)', background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)' }}>
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--cr8w-primary)', textTransform: 'uppercase' }}>Vibe Check</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{d8.vibeCheck}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
