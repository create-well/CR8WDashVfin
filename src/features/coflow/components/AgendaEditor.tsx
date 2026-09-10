import React, { useState } from 'react';
import { Lock, Unlock, Plus, X, Archive } from 'lucide-react';
import type { CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { cardStyle, labelStyle, inputStyle, btnPrimary, btnSecondary, formatD8 } from '../utils';

export function AgendaEditor({ d8, onUpdateD8 }: {
  d8?: CoFlowDate;
  onUpdateD8?: (updates: Partial<CoFlowDate>) => void;
}) {
  const [newItem, setNewItem] = useState('');
  const [newLead, setNewLead] = useState('monny');
  const [newTime, setNewTime] = useState('10');

  if (!d8 || !onUpdateD8) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
          Schedule a d8 first, then build the agenda here.
        </div>
      </div>
    );
  }

  const agenda = d8.agendaItems || [];
  const totalMins = agenda.reduce((sum, item) => sum + (item.timeEstimate || 0), 0);
  const locked = d8.agendaLocked || false;

  function addAgendaItem() {
    if (!newItem.trim() || locked) return;
    const item = { id: Date.now(), text: newItem.trim(), lead: newLead, timeEstimate: parseInt(newTime) || 10, done: false };
    onUpdateD8!({ agendaItems: [...agenda, item] });
    setNewItem('');
  }

  function toggleDone(itemId: number) {
    onUpdateD8!({ agendaItems: agenda.map(i => i.id === itemId ? { ...i, done: !i.done } : i) });
  }

  function removeItem(itemId: number) {
    if (locked) return;
    onUpdateD8!({ agendaItems: agenda.filter(i => i.id !== itemId) });
  }

  function moveItem(idx: number, dir: -1 | 1) {
    if (locked) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= agenda.length) return;
    const updated = [...agenda];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onUpdateD8!({ agendaItems: updated });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={labelStyle}>Agenda for {formatD8(d8.date)}</span>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: 'var(--cr8w-primary)', marginLeft: 8 }}>
            ~{totalMins} min total · {agenda.length} items
          </span>
        </div>
        <button onClick={() => onUpdateD8!({ agendaLocked: !locked })} style={{
          ...btnSecondary, display: 'flex', alignItems: 'center', gap: 5,
          background: locked ? 'rgba(107,175,107,0.12)' : 'var(--sandstone)',
          borderColor: locked ? '#6BAF6B' : 'var(--border-soft)',
          color: locked ? '#3A7A3A' : 'var(--text-secondary)',
        }}>
          {locked ? <Lock size={13} /> : <Unlock size={13} />}
          {locked ? 'Locked' : 'Lock Agenda'}
        </button>
      </div>

      {locked && (
        <div style={{
          padding: '8px 14px', borderRadius: 'var(--cr-radius-sm)',
          background: 'rgba(107,175,107,0.08)', border: '1px solid rgba(107,175,107,0.2)',
          fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5A9A5A',
          marginBottom: 12,
        }}>
          🔒 Agenda is locked for the upcoming BHD. Unlock to make changes.
        </div>
      )}

      {/* Add item (only when not locked) */}
      {!locked && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Agenda item..." style={{ ...inputStyle, flex: '1 1 200px' }} onKeyDown={e => { if (e.key === 'Enter') addAgendaItem(); }} />
            <select value={newLead} onChange={e => setNewLead(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              {Object.entries(PERSONS).map(([k, p]) => <option key={k} value={k}>{p.emoji} {p.name}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ ...inputStyle, width: 55 }} min="1" placeholder="min" />
              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>min</span>
            </div>
            <button onClick={addAgendaItem} style={{ ...btnPrimary, padding: '8px 16px', fontSize: '0.78rem' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Agenda items */}
      {agenda.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No agenda items yet. Add one above.
        </div>
      ) : (
        <div>
          {agenda.map((item, idx) => {
            const lead = PERSONS[item.lead];
            return (
              <div key={item.id} style={{
                ...cardStyle, marginBottom: 6, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: item.done ? 0.5 : 1, transition: 'opacity 0.2s',
              }}>
                {!locked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveItem(idx, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1 }}>▲</button>
                    <button onClick={() => moveItem(idx, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1 }}>▼</button>
                  </div>
                )}
                <button onClick={() => toggleDone(item.id)} style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: item.done ? '#6BAF6B' : 'transparent',
                  border: item.done ? '2px solid #6BAF6B' : '2px solid var(--border-soft)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.7rem',
                }}>
                  {item.done && '✓'}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <span style={{ color: lead?.color || 'var(--text-muted)' }}>{lead?.emoji} {lead?.name || item.lead}</span>
                    <span>~{item.timeEstimate}min</span>
                  </div>
                </div>
                {!locked && (
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4 }}><X size={13} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notes + Vibe Check */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={cardStyle}>
          <span style={labelStyle}>Meeting Notes</span>
          <textarea
            value={d8.notes || ''}
            onChange={e => onUpdateD8({ notes: e.target.value })}
            placeholder="Capture what flows..."
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Vibe Check</span>
          <textarea
            value={d8.vibeCheck || ''}
            onChange={e => onUpdateD8({ vibeCheck: e.target.value })}
            placeholder="How did the energy feel?"
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button onClick={() => onUpdateD8({ status: 'archived' })} style={{
              ...btnSecondary, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Archive size={13} /> Archive This D8
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
