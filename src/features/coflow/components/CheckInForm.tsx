import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CoFlowCheckin, CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { cardStyle, labelStyle, inputStyle, btnPrimary, btnSecondary, PERSON_KEYS, MOOD_OPTIONS, TIME_OPTIONS, LOCATION_SUGGESTIONS } from '../utils';

export function CheckInForm({ onSubmit, nextD8 }: {
  onSubmit: (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => void;
  nextD8?: CoFlowDate;
}) {
  const [author, setAuthor] = useState('monny');
  const [mood, setMood] = useState('sun');
  const [confirmTime, setConfirmTime] = useState(true);
  const [timePreference, setTimePreference] = useState('');
  const [locationSuggestion, setLocationSuggestion] = useState('');
  const [showCustomLoc, setShowCustomLoc] = useState(false);
  const [customLoc, setCustomLoc] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [notes, setNotes] = useState('');

  const weekOf = new Date().toISOString().split('T')[0];

  return (
    <div style={{ ...cardStyle, marginBottom: 20, animation: 'cw-fadeInUp 0.3s ease' }}>
      {/* Who + Mood */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Who's Checking In</label>
          <select value={author} onChange={e => setAuthor(e.target.value)} style={inputStyle}>
            {PERSON_KEYS.map(k => <option key={k} value={k}>{PERSONS[k].emoji} {PERSONS[k].name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>What's your vibe?</label>
          <div style={{ display: 'flex', gap: 4, paddingTop: 2 }}>
            {MOOD_OPTIONS.map(m => (
              <button key={m.key} onClick={() => setMood(m.key)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 'var(--cr-radius-sm)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                cursor: 'pointer',
                background: mood === m.key ? `${m.color}18` : 'var(--bg-elevated)',
                border: `1.5px solid ${mood === m.key ? m.color : 'var(--border-soft)'}`,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{m.emoji}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', fontWeight: 600, color: mood === m.key ? m.color : 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time + Availability */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <label style={labelStyle}>Availability for next BHD</label>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={() => setConfirmTime(true)} style={{
              padding: '8px 16px', borderRadius: 'var(--cr-radius-sm)', cursor: 'pointer',
              background: confirmTime ? 'rgba(107,175,107,0.12)' : 'var(--sandstone)',
              border: confirmTime ? '1.5px solid #6BAF6B' : '1px solid var(--border-soft)',
              color: confirmTime ? '#3A7A3A' : 'var(--text-muted)',
              fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 600,
            }}>✅ Yes</button>
            <button onClick={() => setConfirmTime(false)} style={{
              padding: '8px 16px', borderRadius: 'var(--cr-radius-sm)', cursor: 'pointer',
              background: !confirmTime ? 'rgba(212,167,113,0.12)' : 'var(--sandstone)',
              border: !confirmTime ? '1.5px solid #D4A771' : '1px solid var(--border-soft)',
              color: !confirmTime ? '#8A6A20' : 'var(--text-muted)',
              fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 600,
            }}>Needs Adjusting</button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Time preference</label>
          <select value={timePreference} onChange={e => setTimePreference(e.target.value)} style={inputStyle}>
            <option value="">No preference</option>
            {TIME_OPTIONS.slice(0, -1).map((t, i) => (
              <option key={t} value={`${t} - ${TIME_OPTIONS[i + 1]}`}>{t} - {TIME_OPTIONS[i + 1]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location suggestion */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Spot suggestion</label>
        {!showCustomLoc ? (
          <select value={locationSuggestion} onChange={e => {
            if (e.target.value === '__custom__') { setShowCustomLoc(true); }
            else setLocationSuggestion(e.target.value);
          }} style={inputStyle}>
            <option value="">No suggestion</option>
            {LOCATION_SUGGESTIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            <option value="__custom__">✏️ Type custom...</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={customLoc} onChange={e => setCustomLoc(e.target.value)} placeholder="Suggest a spot..." style={{ ...inputStyle, flex: 1 }} autoFocus />
            <button onClick={() => { setLocationSuggestion(customLoc.trim()); setShowCustomLoc(false); }} style={btnSecondary}>Set</button>
            <button onClick={() => { setShowCustomLoc(false); }} style={{ ...btnSecondary, padding: '6px 10px' }}><X size={12} /></button>
          </div>
        )}
      </div>

      {/* Agenda drop */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Agenda drop (one per line)</label>
        <textarea value={agendaText} onChange={e => setAgendaText(e.target.value)} placeholder="What do you want to bring to the table?" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
      </div>

      {/* Notes */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(anything else on your mind)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Free thoughts..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
      </div>

      <button onClick={() => onSubmit({
        weekOf, author, confirmTime, mood,
        locationSuggestion: locationSuggestion.trim(),
        timePreference: timePreference || undefined,
        notes: notes.trim() || undefined,
        agendaItems: agendaText.split('\n').map(s => s.trim()).filter(Boolean),
      })} style={{ ...btnPrimary, marginTop: 16 }}>
        Drop My Check-In
      </button>
    </div>
  );
}
