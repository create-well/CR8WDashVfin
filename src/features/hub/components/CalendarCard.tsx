import React, { useState, useEffect, useRef } from 'react';
import { GCAL_CLIENT_ID } from '../../../app/components/data';
import type { Workshop, CalendarEventKV } from '../../../app/components/api';
import * as api from '../../../app/components/api';
import { showToast } from '../../../app/components/Toast';
import { TEAM_CALENDAR_EMBED, LogoGCal, matchesCategory } from '../utils';

interface CalendarCardProps {
  activeUser?: string;
  kvCalEvents: CalendarEventKV[];
  setKvCalEvents: React.Dispatch<React.SetStateAction<CalendarEventKV[]>>;
  workshops: Workshop[];
  onNavigate: (view: string) => void;
}

interface WellshopHistoryEntry { id: string; date: string; title: string; reflection: string; }

export function CalendarCard({ activeUser, kvCalEvents, setKvCalEvents, workshops, onNavigate }: CalendarCardProps) {
  const [calendarTab, setCalendarTab] = useState<'calendar' | 'wellshop'>('calendar');
  const [icalSyncing, setIcalSyncing] = useState(false);
  const [icalSyncMsg, setIcalSyncMsg] = useState('');
  
  const userKey = activeUser?.toUpperCase() || '';
  const userTokenKey = `gcal_token_${userKey}`;
  const userNameKey = `gcal_name_${userKey}`;

  const [showPersonalEvents, setShowPersonalEvents] = useState(() => !!localStorage.getItem(userTokenKey));
  const [gcalConnected, setGcalConnected] = useState(() => !!localStorage.getItem(userTokenKey));
  const [gcalEvents, setGcalEvents] = useState<{ time: string; name: string }[]>([]);
  const [gcalLoading, setGcalLoading] = useState(() => localStorage.getItem('gcal_token_fresh') === 'pending');
  const [gcalError, setGcalError] = useState('');
  const [gcalCalendarName, setGcalCalendarName] = useState(() => localStorage.getItem(userNameKey) || '');
  const mountFetchedRef = useRef(false);
  const prevUserRef = useRef(userKey);
  
  // Wellshop state
  const [notifyTick, setNotifyTick] = useState(0);
  const [expandedWellshopCategory, setExpandedWellshopCategory] = useState<string | null>(null);
  
  const [wellshopNextDesc, setWellshopNextDesc] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const k of ['wellshop', 'expresshop', 'playshop']) {
      try { out[k] = localStorage.getItem(`wellshop_next_${k}`) || ''; } catch { out[k] = ''; }
    }
    return out;
  });
  const [wellshopRsvp, setWellshopRsvp] = useState<Record<string, Record<string, boolean>>>(() => {
    const out: Record<string, Record<string, boolean>> = {};
    for (const k of ['wellshop', 'expresshop', 'playshop']) {
      try { const r = localStorage.getItem(`wellshop_rsvp_${k}`); out[k] = r ? JSON.parse(r) : {}; } catch { out[k] = {}; }
    }
    return out;
  });
  const [wellshopHistory, setWellshopHistory] = useState<Record<string, WellshopHistoryEntry[]>>(() => {
    const out: Record<string, WellshopHistoryEntry[]> = {};
    for (const k of ['wellshop', 'expresshop', 'playshop']) {
      try { const r = localStorage.getItem(`wellshop_history_${k}`); out[k] = r ? JSON.parse(r) : []; } catch { out[k] = []; }
    }
    return out;
  });
  const [wellshopShowHistory, setWellshopShowHistory] = useState<Record<string, boolean>>({});
  const [wellshopLogForm, setWellshopLogForm] = useState<string | null>(null);
  const [wellshopLogData, setWellshopLogData] = useState({ date: '', title: '', reflection: '' });

  async function syncIcalCalendar() {
    setIcalSyncing(true);
    setIcalSyncMsg('');
    try {
      const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)
        ?? (() => {
          const h = window.location.hostname;
          return (h.endsWith('.vercel.app') || h === 'createwell.monnyfest.co' || h === 'localhost')
            ? '/api/server' : 'https://cr8w-home-v2.vercel.app/api/server';
        })();
      const res = await fetch(`${apiBase}/calendar-ical-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer sb_publishable_KKMWtvpxkSGaq-xmie6viQ_pRzAb_4i` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setIcalSyncMsg(`Synced ${data.count} event${data.count !== 1 ? 's' : ''} ✓`);
      const updated = await api.getCalendarEvents();
      setKvCalEvents(updated || []);
    } catch (e: any) {
      setIcalSyncMsg(`Sync error: ${e?.message ?? e}`);
    }
    setIcalSyncing(false);
    setTimeout(() => setIcalSyncMsg(''), 4000);
  }

  useEffect(() => {
    if (prevUserRef.current === userKey) return;
    prevUserRef.current = userKey;
    mountFetchedRef.current = false;
    const hasToken = !!localStorage.getItem(userTokenKey);
    setGcalConnected(hasToken);
    setShowPersonalEvents(hasToken);
    setGcalCalendarName(localStorage.getItem(userNameKey) || '');
    setGcalEvents([]);
    setGcalError('');
    setGcalLoading(false);
  }, [userKey, userTokenKey, userNameKey]);

  function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const fetchCalendarEvents = React.useCallback(async (token: string) => {
    setGcalLoading(true);
    setGcalError('');
    try {
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (calRes.ok) {
        const calData = await calRes.json();
        const name = calData.summary || calData.id || 'Google Calendar';
        setGcalCalendarName(name);
        localStorage.setItem(userNameKey, name);
      }
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem(userTokenKey);
        localStorage.removeItem(userNameKey);
        localStorage.removeItem('gcal_token_fresh');
        setGcalConnected(false);
        setGcalCalendarName('');
        setGcalError('Session expired — reconnect Google Calendar');
        return;
      }
      if (!res.ok) throw new Error(`Google Calendar API error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const events = (data.items || []).map((ev: any) => {
        let time = '';
        if (ev.start?.dateTime) {
          time = new Date(ev.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
        } else {
          time = 'All day';
        }
        return { time, name: ev.summary || '(No title)' };
      });
      setGcalEvents(events);
    } catch (e: any) {
      console.error('Google Calendar fetch error:', e);
      setGcalError(e.message || 'Failed to load events');
    } finally {
      setGcalLoading(false);
      localStorage.removeItem('gcal_token_fresh');
    }
  }, [userNameKey, userTokenKey]);

  useEffect(() => {
    if (mountFetchedRef.current) return;
    mountFetchedRef.current = true;
    const freshFlag = localStorage.getItem('gcal_token_fresh');
    if (freshFlag === 'pending') {
      setGcalLoading(true);
      setGcalError('');
      const pollId = setInterval(() => {
        const status = localStorage.getItem('gcal_token_fresh');
        if (status === 'ready') {
          clearInterval(pollId);
          localStorage.removeItem('gcal_token_fresh');
          const token = localStorage.getItem(userTokenKey);
          if (token) { setGcalConnected(true); fetchCalendarEvents(token); }
          else { setGcalLoading(false); setGcalError('Token exchange produced no token. Try reconnecting.'); }
        } else if (status === 'error') {
          clearInterval(pollId);
          const errMsg = localStorage.getItem('gcal_token_error') || 'Token exchange failed';
          localStorage.removeItem('gcal_token_fresh');
          localStorage.removeItem('gcal_token_error');
          setGcalLoading(false);
          setGcalError(errMsg);
        }
      }, 200);
      setTimeout(() => {
        clearInterval(pollId);
        if (localStorage.getItem('gcal_token_fresh') === 'pending') {
          localStorage.removeItem('gcal_token_fresh');
          setGcalLoading(false);
          setGcalError('Token exchange timed out. Try reconnecting.');
        }
      }, 30_000);
      return;
    }
    if (freshFlag === 'ready') localStorage.removeItem('gcal_token_fresh');
    const storedToken = localStorage.getItem(userTokenKey);
    if (storedToken) {
      setGcalConnected(true);
      fetchCalendarEvents(storedToken);
    }
  }, [fetchCalendarEvents, userTokenKey]);

  async function connectGoogleCalendar() {
    const REDIRECT_URI = window.location.origin;
    const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('gcal_pkce_verifier', codeVerifier);
    localStorage.setItem('gcal_oauth_user', activeUser || 'monny');
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
      + `?client_id=${encodeURIComponent(GCAL_CLIENT_ID)}`
      + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
      + `&response_type=code`
      + `&scope=${encodeURIComponent(SCOPES)}`
      + `&code_challenge=${encodeURIComponent(codeChallenge)}`
      + `&code_challenge_method=S256`
      + `&access_type=online`
      + `&prompt=consent`;
    window.location.href = authUrl;
  }

  function disconnectGoogleCalendar() {
    const token = localStorage.getItem(userTokenKey);
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => {});
    }
    localStorage.removeItem(userTokenKey);
    localStorage.removeItem(userNameKey);
    localStorage.removeItem('gcal_pkce_verifier');
    localStorage.removeItem('gcal_token_fresh');
    localStorage.removeItem('gcal_token_error');
    setGcalConnected(false);
    setGcalEvents([]);
    setGcalError('');
    setGcalCalendarName('');
  }

  return (
    <div className="hub-schedule-card">
      <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
        {([
          { key: 'calendar' as const, label: '📅 calendar' },
          { key: 'wellshop' as const, label: '🎨 workshop menu' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setCalendarTab(t.key)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: t.key === 'calendar' ? '10px 0 0 10px' : '0 10px 10px 0',
              border: calendarTab === t.key ? '1.5px solid var(--cr8w-primary)' : '1px solid var(--border-soft)',
              background: calendarTab === t.key ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)' : 'transparent',
              color: calendarTab === t.key ? 'var(--cr8w-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-label)',
              fontSize: '0.72rem',
              fontWeight: calendarTab === t.key ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}
          >{t.label}</button>
        ))}
      </div>

      {calendarTab === 'calendar' && (
        <>
          <div className="hub-section-header">
            <span className="hub-section-title">Calendar</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={syncIcalCalendar}
                disabled={icalSyncing}
                style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(194,91,56,0.35)', background: 'rgba(194,91,56,0.08)', color: '#C25B38', fontFamily: 'var(--font-label)', fontSize: '0.7rem', fontWeight: 600, cursor: icalSyncing ? 'default' : 'pointer', opacity: icalSyncing ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {icalSyncing ? 'Syncing…' : '⟳ Sync Calendar'}
              </button>
              {icalSyncMsg && (
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: icalSyncMsg.startsWith('Sync error') ? '#C03020' : '#3A7A3A' }}>{icalSyncMsg}</span>
              )}
              <a
                href="https://calendar.google.com/calendar/u/0/r"
                target="_blank" rel="noopener noreferrer"
                className="hub-gcal-open"
              >Open ↗</a>
            </div>
          </div>
          <iframe
            src={TEAM_CALENDAR_EMBED}
            title="CR8W Shared Team Calendar"
            style={{ width: '100%', height: 400, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', marginBottom: 0 }}
            frameBorder="0" scrolling="no"
          />
          <div style={{ height: 1, background: 'var(--border-soft)', margin: '14px 0 10px' }} />
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 600,
            color: showPersonalEvents ? (gcalConnected ? '#3A7A3A' : 'var(--text-primary)') : 'var(--text-muted)',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={showPersonalEvents}
              onChange={e => {
                setShowPersonalEvents(e.target.checked);
                if (e.target.checked && gcalConnected && gcalEvents.length === 0) {
                  const token = localStorage.getItem(userTokenKey);
                  if (token) fetchCalendarEvents(token);
                }
              }}
              style={{ accentColor: '#1A73E8', width: 16, height: 16 }}
            />
            Show my personal events
          </label>

          {showPersonalEvents && (
            <div style={{ marginTop: 10 }}>
              {!gcalConnected ? (
                <>
                  <button
                    onClick={connectGoogleCalendar}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(26,115,232,0.1)', border: '1px solid rgba(26,115,232,0.3)',
                      color: '#1A73E8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      fontFamily: 'var(--font-label)', letterSpacing: '0.02em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <LogoGCal size={18} /> Connect Google Calendar
                  </button>
                  {gcalError && (
                    <div style={{ fontSize: '0.72rem', color: '#D46B6B', marginTop: 6, fontFamily: 'var(--font-label)' }}>
                      Personal calendar connection issue: {gcalError}
                      <div style={{ marginTop: 2, color: 'var(--text-muted)' }}>Shared community events above are still available.</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{
                    fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: '#3A7A3A',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3A7A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    YOUR SCHEDULE{gcalCalendarName ? ` \u00b7 ${gcalCalendarName}` : ''}
                    <button
                      onClick={disconnectGoogleCalendar}
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6rem',
                        fontFamily: 'var(--font-label)', textDecoration: 'underline',
                      }}
                    >Disconnect</button>
                  </div>

                  {gcalLoading ? (
                    <div style={{ padding: '12px 0', textAlign: 'center', color: '#1A73E8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="#1A73E8" strokeWidth="2.5" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                      </svg>
                      {localStorage.getItem('gcal_token_fresh') === 'pending' ? 'Connecting to Google Calendar...' : 'Loading events...'}
                    </div>
                  ) : gcalError ? (
                    <div style={{ fontSize: '0.72rem', color: '#D46B6B', padding: '8px 0', fontFamily: 'var(--font-label)' }}>
                      Personal calendar connection issue: {gcalError}
                      <button onClick={connectGoogleCalendar} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#1A73E8', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit' }}>Reconnect</button>
                    </div>
                  ) : gcalEvents.length === 0 ? (
                    <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>No personal events scheduled for today</div>
                  ) : (
                    <div className="hub-schedule-list">
                      {gcalEvents.map((ev, i) => (
                        <div key={i} className="hub-schedule-item">
                          <span className="hub-schedule-dot" style={{ background: '#1A73E8' }} />
                          <span className="hub-schedule-time">{ev.time}</span>
                          <span className="hub-schedule-name">{ev.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {calendarTab === 'wellshop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { key: 'wellshop', emoji: '🪴', title: 'wellshop', subtitle: 'inner nurture', accent: '#A8B5A0', desc: 'journaling, reflection, grounding, decomprocessing' },
            { key: 'expresshop', emoji: '🎤', title: 'expresshop', subtitle: 'outer expression', accent: '#E8967D', desc: 'sharing, presenting, pitching, storytelling' },
            { key: 'playshop', emoji: '🎟️', title: 'playshop', subtitle: 'pure play', accent: '#E8C875', desc: 'make whatever tf you want, then show & tell' },
          ]).map(cat => {
            const notifyKey = `wellshop_notify_${cat.key}`;
            const isNotified = localStorage.getItem(notifyKey) === '1';
            const historyEntries = wellshopHistory[cat.key] || [];
            const historyCount = historyEntries.length;
            const rsvpData = wellshopRsvp[cat.key] || {};
            const RSVP_PEOPLE = [
              { key: 'sunshine', emoji: '☀️', color: '#D4A5A5' },
              { key: 'monny', emoji: '🌊', color: '#7BA89D' },
              { key: 'bingle', emoji: '✨', color: '#B8A9D4' },
            ];
            return (
              <div key={cat.key} className="wellshop-category-card" style={{ background: `${cat.accent}12`, border: `1.5px solid ${cat.accent}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span style={{ fontSize: '1.1rem', marginRight: 6 }}>{cat.emoji}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: '0.95rem', color: 'var(--cr8w-text, #2C1C10)', fontWeight: 500 }}>{cat.title}</span>
                    {historyCount > 0 && <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontFamily: 'var(--font-label)', fontWeight: 700, background: `${cat.accent}25`, color: cat.accent }}>({historyCount})</span>}
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: cat.accent, marginLeft: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{cat.subtitle}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (isNotified) localStorage.removeItem(notifyKey);
                      else localStorage.setItem(notifyKey, '1');
                      setNotifyTick(t => t + 1);
                    }}
                    className="wellshop-notify-btn"
                    style={{
                      padding: '4px 10px', borderRadius: 8,
                      border: isNotified ? `1px solid ${cat.accent}` : '1px solid var(--border-soft)',
                      background: isNotified ? `${cat.accent}20` : 'transparent',
                      color: isNotified ? cat.accent : 'var(--text-muted)',
                      fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{isNotified ? '✅ notifying' : '🔔 notify me'}</button>
                </div>
                <div style={{ fontFamily: "var(--font-label)", fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{cat.desc}</div>
                <div style={{ marginTop: 8 }}>
                  <span
                    className="wellshop-see-upcoming"
                    onClick={() => setExpandedWellshopCategory(expandedWellshopCategory === cat.key ? null : cat.key)}
                    style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: cat.accent, fontWeight: 600, cursor: 'pointer' }}
                  >{expandedWellshopCategory === cat.key ? 'hide ↑' : 'see upcoming →'}</span>
                </div>
                {expandedWellshopCategory === cat.key && (
                  <div style={{ animation: 'cw-fadeInUp 0.25s ease' }}>
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 10, border: `1px dashed ${cat.accent}50` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', fontWeight: 700, color: cat.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>next session</span>
                      </div>
                      <input
                        type="text"
                        placeholder={`session theme for next ${cat.title}...`}
                        value={wellshopNextDesc[cat.key] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setWellshopNextDesc(prev => ({ ...prev, [cat.key]: val }));
                          try { localStorage.setItem(`wellshop_next_${cat.key}`, val); } catch {}
                        }}
                        style={{
                          width: '100%', border: '1px solid var(--border-soft)', borderRadius: 8,
                          padding: '5px 10px', fontSize: '0.78rem', fontFamily: "var(--font-label)",
                          color: 'var(--cr8w-text, #2D2438)', background: 'var(--cr8w-surface, #fff)', outline: 'none',
                          marginBottom: 8, boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>RSVP</span>
                        {RSVP_PEOPLE.map(p => {
                          const attending = !!rsvpData[p.key];
                          return (
                            <button
                              key={p.key}
                              onClick={() => {
                                const next = { ...rsvpData, [p.key]: !attending };
                                setWellshopRsvp(prev => ({ ...prev, [cat.key]: next }));
                                try { localStorage.setItem(`wellshop_rsvp_${cat.key}`, JSON.stringify(next)); } catch {}
                              }}
                              style={{
                                width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                                border: attending ? `2px solid ${p.color}` : '2px solid #ccc',
                                background: attending ? `${p.color}30` : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.68rem', padding: 0, position: 'relative',
                              }}
                            >
                              {p.emoji}
                              {attending && <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '0.5rem', background: p.color, color: '#fff', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      const matched = workshops
                        .filter(w => matchesCategory(w, cat.key) && (w.status === 'scheduled' || w.status === 'planning'))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 4);
                      return matched.length > 0 ? (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: `1px solid ${cat.accent}25` }}>
                          {matched.map(w => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(44,28,16,0.05)' }}>
                              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', fontWeight: 700, color: cat.accent, textTransform: 'uppercase', minWidth: 55 }}>
                                {new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span style={{ fontFamily: "var(--font-label)", fontSize: '0.82rem', color: '#2C1C10', flex: 1 }}>{w.title}</span>
                              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{w.status}</span>
                            </div>
                          ))}
                          <div style={{ textAlign: 'center', marginTop: 6 }}>
                            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: cat.accent, fontWeight: 600, cursor: 'pointer' }} onClick={() => onNavigate('workshops')}>view all in workshops →</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, padding: '8px 12px', fontFamily: "var(--font-label)", fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                          no upcoming {cat.key}s yet — <span style={{ color: cat.accent, cursor: 'pointer', fontWeight: 600, fontStyle: 'normal' }} onClick={() => onNavigate('workshops')}>add one in workshops</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
