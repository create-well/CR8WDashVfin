import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CoFlowDate } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import {
  cardStyle, labelStyle, inputStyle, btnPrimary, btnSecondary,
  getNextFriday, getDayOfWeekLabel, TIME_OPTIONS, LOCATION_SUGGESTIONS, PERSON_KEYS
} from '../utils';

export function AddDateModal({ onSubmit }: {
  onSubmit: (d: Omit<CoFlowDate, 'id' | 'created_at'>) => void;
}) {
  const [date, setDate] = useState(getNextFriday());
  const [startTime, setStartTime] = useState('4:00 PM');
  const [endTime, setEndTime] = useState('8:00 PM');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [showCustomLoc, setShowCustomLoc] = useState(true);
  const [host, setHost] = useState('monny');
  const [theme, setTheme] = useState('');
  const [rsvp, setRsvp] = useState<Record<string, string>>({ sunshine: 'yes', monny: 'yes', bingle: 'yes' });

  const rsvpOptions = [
    { key: 'yes', label: 'Going', color: '#6BAF6B', bg: 'rgba(107,175,107,0.12)' },
    { key: 'maybe', label: 'Maybe', color: '#D4A771', bg: 'rgba(212,167,113,0.12)' },
    { key: 'no', label: "Can't make it", color: '#D46B6B', bg: 'rgba(212,107,107,0.12)' },
  ];

  return (
    <div style={{ ...cardStyle, marginBottom: 20, animation: 'cw-fadeInUp 0.3s ease' }}>
      {/* Date + Day Label */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--cr8w-primary)',
            marginTop: 4, fontWeight: 500,
          }}>
            {getDayOfWeekLabel(date)}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Host</label>
          <select value={host} onChange={e => setHost(e.target.value)} style={inputStyle}>
            {PERSON_KEYS.map(k => (
              <option key={k} value={k}>{PERSONS[k].emoji} {PERSONS[k].name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Time split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <label style={labelStyle}>Start Time</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>End Time</label>
          <select value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Location combobox */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Location</label>
        {!showCustomLoc ? (
          <div>
            <select value={location} onChange={e => {
              if (e.target.value === '__custom__') { setShowCustomLoc(true); setLocation(''); }
              else setLocation(e.target.value);
            }} style={inputStyle}>
              {LOCATION_SUGGESTIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              <option value="__custom__">✏️ Type custom location...</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={customLocation}
              onChange={e => setCustomLocation(e.target.value)}
              placeholder="Type a custom location..."
              style={{ ...inputStyle, flex: 1 }}
              autoFocus
            />
            <button onClick={() => { if (customLocation.trim()) setLocation(customLocation.trim()); setShowCustomLoc(false); }} style={{ ...btnSecondary, fontSize: '0.72rem' }}>Set</button>
            <button onClick={() => { setShowCustomLoc(false); setLocation(''); }} style={{ ...btnSecondary, fontSize: '0.72rem', padding: '6px 10px' }}><X size={12} /></button>
          </div>
        )}
        {!showCustomLoc && location && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            📍 {location}
          </div>
        )}
      </div>

      {/* Theme / Vibe */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Theme / Vibe <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder='e.g. "vision board night", "pottery + planning"'
          style={inputStyle}
        />
      </div>

      {/* RSVP Section */}
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>RSVP Status</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PERSON_KEYS.map(key => {
            const person = PERSONS[key];
            const currentRsvp = rsvp[key] || 'yes';
            return (
              <div key={key} style={{
                flex: '1 1 140px', padding: '10px', borderRadius: 'var(--cr-radius-sm)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{person.emoji}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{person.name}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {rsvpOptions.map(opt => (
                    <button key={opt.key} onClick={() => setRsvp(prev => ({ ...prev, [key]: opt.key }))} style={{
                      padding: '3px 7px', borderRadius: 8, fontSize: '0.58rem',
                      fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: '0.2px',
                      background: currentRsvp === opt.key ? opt.bg : 'transparent',
                      color: currentRsvp === opt.key ? opt.color : 'var(--text-muted)',
                      border: `1px solid ${currentRsvp === opt.key ? opt.color : 'var(--border-soft)'}`,
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => onSubmit({
        date, startTime, endTime,
        timeRange: `${startTime} - ${endTime}`,
        location: showCustomLoc ? customLocation.trim() || 'TBD' : location,
        host, theme: theme.trim(),
        rsvp,
        agendaItems: [], notes: '', vibeCheck: '', status: 'upcoming',
      })} style={{ ...btnPrimary, marginTop: 16 }}>
        Schedule This D8
      </button>
    </div>
  );
}

export function EditD8Form({ d8, onSave, onCancel }: {
  d8: CoFlowDate;
  onSave: (updates: Partial<CoFlowDate>) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(d8.date);
  const [startTime, setStartTime] = useState(d8.startTime || '4:00 PM');
  const [endTime, setEndTime] = useState(d8.endTime || '8:00 PM');
  const [location, setLocation] = useState(d8.location || '');
  const [customLocation, setCustomLocation] = useState('');
  const isCustom = !LOCATION_SUGGESTIONS.includes(location);
  const [showCustomLoc, setShowCustomLoc] = useState(isCustom);
  const [host, setHost] = useState(d8.host || 'monny');
  const [theme, setTheme] = useState(d8.theme || '');
  const [vibeCheck, setVibeCheck] = useState(d8.vibeCheck || '');

  return (
    <div style={{ ...cardStyle, marginBottom: 20, animation: 'cw-fadeInUp 0.3s ease', borderColor: 'var(--cr8w-primary)', borderWidth: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cr8w-primary)', fontWeight: 700 }}>
          ✏️ Edit D8
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--cr8w-primary)', marginTop: 4 }}>
            {getDayOfWeekLabel(date)}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Host</label>
          <select value={host} onChange={e => setHost(e.target.value)} style={inputStyle}>
            {PERSON_KEYS.map(k => (
              <option key={k} value={k}>{PERSONS[k].emoji} {PERSONS[k].name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Start Time</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>End Time</label>
          <select value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle}>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Location</label>
        {!showCustomLoc ? (
          <select value={location} onChange={e => {
            if (e.target.value === '__custom__') { setShowCustomLoc(true); setCustomLocation(location); }
            else setLocation(e.target.value);
          }} style={inputStyle}>
            {LOCATION_SUGGESTIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            <option value="__custom__">✏️ Type custom...</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="Custom location..." style={{ ...inputStyle, flex: 1 }} autoFocus />
            <button onClick={() => { setLocation(customLocation.trim() || location); setShowCustomLoc(false); }} style={btnSecondary}>Set</button>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Theme / Vibe</label>
        <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Session theme..." style={inputStyle} />
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Vibe Check Note</label>
        <input value={vibeCheck} onChange={e => setVibeCheck(e.target.value)} placeholder="What's the energy?" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={() => onSave({
          date, startTime, endTime, timeRange: `${startTime} - ${endTime}`,
          location: showCustomLoc ? customLocation.trim() || location : location,
          host, theme: theme.trim(), vibeCheck: vibeCheck.trim(),
        })} style={btnPrimary}>
          Save Changes
        </button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  );
}
