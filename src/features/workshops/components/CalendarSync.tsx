import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, Plus, X, RefreshCw, Unlink, Trash2, Edit3, Check, ExternalLink } from 'lucide-react';
import { GCAL_CLIENT_ID, PERSONS } from '@/app/components/data';
import type { Workshop, CalendarEventKV } from '@/app/components/api';
import { getCalendarEvents } from '@/app/components/api';
import type { GCalEvent } from '../types';
import { FACILITATOR_COLORS } from '../constants';

interface CalendarSyncProps {
  workshops: Workshop[];
}

export function CalendarSync({ workshops }: CalendarSyncProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // ── KV Calendar Events: workshop-filtered Rhythm timeline ────────────────
  const [kvCalEvents, setKvCalEvents] = useState<CalendarEventKV[]>([]);
  const [kvCalLoading, setKvCalLoading] = useState(true);

  useEffect(() => {
    getCalendarEvents()
      .then(events => setKvCalEvents(Array.isArray(events) ? events : []))
      .catch(e => console.error('Rhythm calendar fetch error:', e))
      .finally(() => setKvCalLoading(false));
  }, []);

  const WORKSHOP_KEYWORDS = /workshop|wellshop|expresshop|playshop/i;
  const workshopCalEvents = useMemo(() => {
    return kvCalEvents
      .filter(ev => WORKSHOP_KEYWORDS.test(ev.title || '') || WORKSHOP_KEYWORDS.test(ev.description || ''))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [kvCalEvents]);

  // ── Google Calendar state ────────────────────────────────────────────────
  const [gcalConnected, setGcalConnected] = useState(() => !!localStorage.getItem('gcal_token_MONNY'));
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState('');
  const [gcalCalName, setGcalCalName] = useState(() => localStorage.getItem('gcal_name_MONNY') || '');

  // Event editor state
  const [editingEvent, setEditingEvent] = useState<GCalEvent | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', date: '', startTime: '10:00', endTime: '11:00', description: '', location: '' });
  const [saving, setSaving] = useState(false);

  const mountFetchedRef = useRef(false);

  // ── Token helpers ────────────────────────────────────────────────────────
  function getStoredToken(): string | null {
    for (const k of ['MONNY', 'SUNSHINE', 'BINGLE']) {
      const t = localStorage.getItem(`gcal_token_${k}`);
      if (t) return t;
    }
    return localStorage.getItem('gcal_access_token');
  }

  function getTokenUserKey(): string {
    for (const k of ['MONNY', 'SUNSHINE', 'BINGLE']) {
      if (localStorage.getItem(`gcal_token_${k}`)) return k;
    }
    return 'MONNY';
  }

  // ── PKCE helpers ─────────────────────────────────────────────────────────
  function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ── Fetch events for the current month ───────────────────────────────────
  const fetchGcalEvents = useCallback(async (token: string) => {
    setGcalLoading(true);
    setGcalError('');
    try {
      const timeMin = new Date(currentMonth.year, currentMonth.month, 1).toISOString();
      const timeMax = new Date(currentMonth.year, currentMonth.month + 1, 0, 23, 59, 59).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        setGcalConnected(false);
        setGcalError('Session expired — reconnect Google Calendar');
        return;
      }
      if (!res.ok) throw new Error(`Google Calendar API error ${res.status}`);
      const data = await res.json();
      setGcalEvents(data.items || []);

      if (!gcalCalName) {
        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (calRes.ok) {
          const calData = await calRes.json();
          const name = calData.summary || calData.id || 'Google Calendar';
          setGcalCalName(name);
          localStorage.setItem(`gcal_name_${getTokenUserKey()}`, name);
        }
      }
    } catch (e: any) {
      console.error('GCal fetch error:', e);
      setGcalError(e.message || 'Failed to load events');
    } finally {
      setGcalLoading(false);
    }
  }, [currentMonth, gcalCalName]);

  // ── On mount + month change: load events ─────────────────────────────────
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setGcalConnected(true);
      fetchGcalEvents(token);
    } else {
      setGcalConnected(false);
      setGcalEvents([]);
    }
  }, [fetchGcalEvents]);

  // ── Poll for token exchange completion on mount ──────────────────────────
  useEffect(() => {
    if (mountFetchedRef.current) return;
    mountFetchedRef.current = true;
    const flag = localStorage.getItem('gcal_token_fresh');
    if (flag === 'pending') {
      setGcalLoading(true);
      const pollId = setInterval(() => {
        const status = localStorage.getItem('gcal_token_fresh');
        if (status === 'ready') {
          clearInterval(pollId);
          localStorage.removeItem('gcal_token_fresh');
          const token = getStoredToken();
          if (token) { setGcalConnected(true); fetchGcalEvents(token); }
          else setGcalLoading(false);
        } else if (status === 'error') {
          clearInterval(pollId);
          const err = localStorage.getItem('gcal_token_error') || 'Token exchange failed';
          localStorage.removeItem('gcal_token_fresh');
          localStorage.removeItem('gcal_token_error');
          setGcalLoading(false);
          setGcalError(err);
        }
      }, 200);
      setTimeout(() => { clearInterval(pollId); if (localStorage.getItem('gcal_token_fresh') === 'pending') { localStorage.removeItem('gcal_token_fresh'); setGcalLoading(false); setGcalError('Token exchange timed out.'); } }, 30_000);
    }
  }, [fetchGcalEvents]);

  // ── Connect Google Calendar ──────────────────────────────────────────────
  async function connectGcal() {
    const REDIRECT_URI = window.location.origin;
    const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('gcal_pkce_verifier', codeVerifier);
    localStorage.setItem('gcal_oauth_user', 'monny');
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

  // ── Disconnect ───────────────────────────────────────────────────────────
  function disconnectGcal() {
    const token = getStoredToken();
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => {});
    }
    for (const k of ['MONNY', 'SUNSHINE', 'BINGLE']) {
      localStorage.removeItem(`gcal_token_${k}`);
      localStorage.removeItem(`gcal_name_${k}`);
    }
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_pkce_verifier');
    localStorage.removeItem('gcal_token_fresh');
    setGcalConnected(false);
    setGcalEvents([]);
    setGcalCalName('');
  }

  // ── Create event on Google Calendar ──────────────────────────────────────
  async function createGcalEvent(form: typeof eventForm) {
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    try {
      const body: any = {
        summary: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
      };
      if (form.startTime && form.endTime) {
        body.start = { dateTime: `${form.date}T${form.startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        body.end = { dateTime: `${form.date}T${form.endTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      } else {
        body.start = { date: form.date };
        body.end = { date: form.date };
      }
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const created = await res.json();
      setGcalEvents(prev => [...prev, created]);
      setShowAddEvent(false);
      setEventForm({ title: '', date: '', startTime: '10:00', endTime: '11:00', description: '', location: '' });
    } catch (e: any) {
      console.error('Create event error:', e);
      setGcalError(e.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  }

  // ── Update event on Google Calendar ──────────────────────────────────────
  async function updateGcalEvent(eventId: string, form: typeof eventForm) {
    const token = getStoredToken();
    if (!token) return;
    setSaving(true);
    try {
      const body: any = {
        summary: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
      };
      if (form.startTime && form.endTime) {
        body.start = { dateTime: `${form.date}T${form.startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        body.end = { dateTime: `${form.date}T${form.endTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      } else {
        body.start = { date: form.date };
        body.end = { date: form.date };
      }
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const updated = await res.json();
      setGcalEvents(prev => prev.map(e => e.id === eventId ? updated : e));
      setEditingEvent(null);
    } catch (e: any) {
      console.error('Update event error:', e);
      setGcalError(e.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete event from Google Calendar ────────────────────────────────────
  async function deleteGcalEvent(eventId: string) {
    const token = getStoredToken();
    if (!token) return;
    if (!confirm('Remove this event from Google Calendar?')) return;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204 && res.status !== 410) throw new Error(`Delete failed: ${res.status}`);
      setGcalEvents(prev => prev.filter(e => e.id !== eventId));
      setEditingEvent(null);
    } catch (e: any) {
      console.error('Delete event error:', e);
      setGcalError(e.message || 'Failed to delete event');
    }
  }

  // ── Calendar math ────────────────────────────────────────────────────────
  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const workshopsByDate = useMemo(() => {
    const map: Record<string, Workshop[]> = {};
    workshops.forEach(w => {
      if (!w.date) return;
      const d = new Date(w.date + 'T00:00:00');
      if (d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(w);
      }
    });
    return map;
  }, [workshops, currentMonth]);

  const gcalByDate = useMemo(() => {
    const map: Record<string, GCalEvent[]> = {};
    gcalEvents.forEach(ev => {
      const dateStr = ev.start?.dateTime?.slice(0, 10) || ev.start?.date;
      if (!dateStr) return;
      const d = new Date(dateStr + 'T00:00:00');
      if (d.getFullYear() === currentMonth.year && d.getMonth() === currentMonth.month) {
        const key = d.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    });
    return map;
  }, [gcalEvents, currentMonth]);

  function prevMonth() {
    setCurrentMonth(prev => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  }
  function nextMonth() {
    setCurrentMonth(prev => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentMonth.year && today.getMonth() === currentMonth.month;

  function formatEventTime(ev: GCalEvent): string {
    if (ev.start?.dateTime) {
      return new Date(ev.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }
    return 'all day';
  }

  function openAddEventForDay(day: number) {
    const m = (currentMonth.month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    setEventForm({ title: '', date: `${currentMonth.year}-${m}-${d}`, startTime: '10:00', endTime: '11:00', description: '', location: '' });
    setShowAddEvent(true);
    setSelectedDay(day);
  }

  function openEditEvent(ev: GCalEvent) {
    const dateStr = ev.start?.dateTime?.slice(0, 10) || ev.start?.date || '';
    const startTime = ev.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0, 5) : '';
    const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime).toTimeString().slice(0, 5) : '';
    setEventForm({
      title: ev.summary || '',
      date: dateStr,
      startTime,
      endTime,
      description: ev.description || '',
      location: ev.location || '',
    });
    setEditingEvent(ev);
  }

  // ── Upcoming events list (next 14 days from today) ───────────────────────
  const upcomingEvents = useMemo(() => {
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(nowDate);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    return gcalEvents
      .map(ev => {
        const dateStr = ev.start?.dateTime || ev.start?.date || '';
        const d = new Date(dateStr);
        return { ...ev, _date: d };
      })
      .filter(ev => ev._date >= nowDate && ev._date <= twoWeeksOut)
      .sort((a, b) => a._date.getTime() - b._date.getTime())
      .slice(0, 8);
  }, [gcalEvents]);

  // ── Inline styles ────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
    padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)',
  };
  const btnSmall: React.CSSProperties = {
    background: 'var(--sandstone)', border: 'none', borderRadius: 'var(--cr-radius-sm)',
    padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: '0.8rem', color: 'var(--text-secondary)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 'var(--cr-radius-sm)',
    border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)',
    fontSize: '0.82rem', background: 'var(--bg-card)', color: 'var(--text-primary)',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase' as const,
    letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-label)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', margin: 0 }}>
          Workshop Calendar
        </h2>
        {/* GCal connection controls */}
        {gcalConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: 'var(--cr8w-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7AB87A' }} />
              {gcalCalName || 'Google Calendar'}
            </span>
            <button onClick={() => { const t = getStoredToken(); if (t) fetchGcalEvents(t); }} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <RefreshCw size={14} className={gcalLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={disconnectGcal} title="Disconnect" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
              <Unlink size={14} />
            </button>
          </div>
        ) : (
          <button onClick={connectGcal} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--cr-radius-md)',
            background: 'var(--cr8w-primary)', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.3px',
          }}>
            <Calendar size={14} /> Connect Google Cal
          </button>
        )}
      </div>

      {gcalError && (
        <div style={{
          background: 'rgba(212,107,107,0.08)', border: '1px solid rgba(212,107,107,0.2)',
          borderRadius: 'var(--cr-radius-sm)', padding: '8px 12px', marginBottom: 12,
          fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#D46B6B',
        }}>
          {gcalError}
          <button onClick={() => setGcalError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D46B6B', marginLeft: 8, fontSize: '1rem' }}>&times;</button>
        </div>
      )}

      {/* ── Workshop Rhythm Timeline (KV calendar events) ── */}
      <div style={{
        ...cardStyle, marginBottom: 16,
        borderLeft: '4px solid var(--cr8w-secondary, #B8A9D4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.1rem' }}>📆</span>
          <span style={{
            fontFamily: 'var(--font-label)', fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600,
          }}>
            workshop rhythm
          </span>
          <span style={{
            fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 700,
            background: 'rgba(var(--cr8w-secondary-rgb, 184,169,212),0.15)', color: 'var(--cr8w-secondary, #B8A9D4)',
            padding: '2px 8px', borderRadius: 10,
          }}>
            {workshopCalEvents.length}
          </span>
        </div>
        {kvCalLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
            loading rhythm events...
          </div>
        ) : workshopCalEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            no rhythm events on the calendar yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workshopCalEvents.map(ev => {
              const startDate = ev.start ? new Date(ev.start) : null;
              const dateLabel = startDate
                ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : '';
              const timeLabel = startDate && ev.start.includes('T')
                ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
                : 'all day';
              const endDate = ev.end ? new Date(ev.end) : null;
              const endLabel = endDate && ev.end.includes('T')
                ? endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
                : '';
              const isPast = startDate ? startDate < new Date() : false;

              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--cr-radius-sm, 8px)',
                  background: isPast ? 'transparent' : 'rgba(var(--cr8w-secondary-rgb, 184,169,212),0.04)',
                  opacity: isPast ? 0.55 : 1,
                  transition: 'background 0.15s',
                }}>
                  {/* Date column */}
                  <div style={{ flexShrink: 0, width: 48, textAlign: 'center', paddingTop: 2 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700,
                      color: isPast ? 'var(--text-muted)' : 'var(--cr8w-secondary, #B8A9D4)',
                      lineHeight: 1,
                    }}>
                      {startDate ? startDate.getDate() : '?'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-label)', fontSize: '0.55rem',
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px',
                    }}>
                      {startDate ? startDate.toLocaleDateString('en-US', { month: 'short' }) : ''}
                    </div>
                  </div>
                  {/* Timeline dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isPast ? 'var(--text-muted)' : 'var(--cr8w-secondary, #B8A9D4)',
                    }} />
                    <div style={{ width: 1, flex: 1, background: 'var(--border-soft)', minHeight: 20 }} />
                  </div>
                  {/* Event details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '0.84rem', fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: 'var(--text-muted)',
                      display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2,
                    }}>
                      <span>{dateLabel}</span>
                      <span>{timeLabel}{endLabel ? ` – ${endLabel}` : ''}</span>
                      {ev.location && <span>📍 {ev.location}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upcoming Events (GCal integrated) ── */}
      {gcalConnected && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              upcoming (next 14 days)
            </span>
            <button onClick={() => { const m = (today.getMonth() + 1).toString().padStart(2, '0'); const d = today.getDate().toString().padStart(2, '0'); setEventForm({ title: '', date: `${today.getFullYear()}-${m}-${d}`, startTime: '10:00', endTime: '11:00', description: '', location: '' }); setShowAddEvent(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 'var(--cr-radius-sm)',
              background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.1)', color: 'var(--cr8w-primary)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600,
            }}>
              <Plus size={12} /> Add Event
            </button>
          </div>
          {gcalLoading && upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
              Loading events...
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontStyle: 'italic' }}>
              no upcoming events in the next 14 days
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcomingEvents.map(ev => {
                const dateLabel = ev._date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeLabel = formatEventTime(ev);
                const diffDays = Math.ceil((ev._date.getTime() - new Date().setHours(0,0,0,0)) / (86400000));
                const relLabel = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays}d`;
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.04)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onClick={() => openEditEvent(ev)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.10)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.04)'}
                  >
                    <div style={{ flexShrink: 0, width: 36, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--cr8w-primary)', lineHeight: 1 }}>
                        {ev._date.getDate()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {ev._date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.summary || '(No title)'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        {timeLabel}{ev.location ? ` · ${ev.location}` : ''}
                      </div>
                    </div>
                    <div style={{
                      flexShrink: 0, padding: '2px 8px', borderRadius: 6,
                      background: diffDays === 0 ? 'var(--cr8w-primary)' : 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)',
                      color: diffDays === 0 ? '#fff' : 'var(--cr8w-primary)',
                      fontFamily: 'var(--font-label)', fontSize: '0.6rem', fontWeight: 600,
                    }}>
                      {relLabel}
                    </div>
                    <Edit3 size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Not connected empty state ── */}
      {!gcalConnected && (
        <div style={{
          ...cardStyle, textAlign: 'center', padding: '32px 20px', marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(var(--cr8w-primary-rgb, 123,168,157),0.04), rgba(var(--cr8w-secondary-rgb, 184,169,212),0.04))',
        }}>
          <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Connect Google Calendar to sync events
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
            add, edit, and remove events directly from the dashboard — everything syncs back to Google Calendar
          </p>
        </div>
      )}

      {/* ── Calendar Grid ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={prevMonth} style={btnSmall}>&larr;</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            {monthName}
          </span>
          <button onClick={nextMonth} style={btnSmall}>&rarr;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{
              textAlign: 'center', fontFamily: 'var(--font-label)', fontSize: '0.65rem',
              textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', padding: '4px 0',
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 56 }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayWorkshops = workshopsByDate[day.toString()] || [];
            const dayGcal = gcalByDate[day.toString()] || [];
            const isToday = isCurrentMonth && today.getDate() === day;
            const hasEvents = dayWorkshops.length > 0 || dayGcal.length > 0;

            return (
              <div
                key={day}
                onClick={() => gcalConnected && openAddEventForDay(day)}
                style={{
                  minHeight: 56, padding: 4, borderRadius: 'var(--cr-radius-sm)',
                  background: isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)' : 'transparent',
                  border: isToday ? '1.5px solid var(--cr8w-primary)' : '1px solid transparent',
                  cursor: gcalConnected ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (gcalConnected) e.currentTarget.style.background = isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)' : 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)' : 'transparent'; }}
              >
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.72rem',
                  color: isToday ? 'var(--cr8w-primary)' : 'var(--text-secondary)',
                  fontWeight: isToday ? 700 : 400, marginBottom: 2,
                }}>
                  {day}
                </div>
                {/* Workshop dots */}
                {dayWorkshops.map(w => (
                  <div key={w.id} title={`${w.title} — ${PERSONS[w.facilitator]?.name || w.facilitator}`} style={{
                    width: '100%', height: 4, borderRadius: 2,
                    background: FACILITATOR_COLORS[w.facilitator] || 'var(--cr8w-primary)',
                    marginBottom: 2,
                  }} />
                ))}
                {/* Google Cal event dots */}
                {dayGcal.slice(0, 3).map((ev, idx) => (
                  <div
                    key={ev.id}
                    title={ev.summary || '(No title)'}
                    onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                    style={{
                      width: '100%', height: 4, borderRadius: 2,
                      background: 'var(--cr8w-secondary, #B8A9D4)',
                      marginBottom: 2, cursor: 'pointer',
                    }}
                  />
                ))}
                {dayGcal.length > 3 && (
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    +{dayGcal.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {(['monny', 'sunshine', 'bingle'] as const).map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'var(--font-label)', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 4, borderRadius: 2, background: FACILITATOR_COLORS[key] }} />
              {PERSONS[key].name}
            </div>
          ))}
          {gcalConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'var(--font-label)', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 4, borderRadius: 2, background: 'var(--cr8w-secondary, #B8A9D4)' }} />
              Google Calendar
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Event Modal ── */}
      {(showAddEvent || editingEvent) && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}
        onClick={() => { setShowAddEvent(false); setEditingEvent(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
              padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h3>
              <button onClick={() => { setShowAddEvent(false); setEditingEvent(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Event name" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" value={eventForm.startTime} onChange={e => setEventForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" value={eventForm.endTime} onChange={e => setEventForm(f => ({ ...f, endTime: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Location (optional)</label>
                <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Where" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
              {editingEvent && (
                <button onClick={() => deleteGcalEvent(editingEvent.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', borderRadius: 'var(--cr-radius-sm)',
                  background: 'rgba(212,107,107,0.08)', color: '#D46B6B',
                  border: '1px solid rgba(212,107,107,0.2)', cursor: 'pointer',
                  fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600,
                }}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button onClick={() => { setShowAddEvent(false); setEditingEvent(null); }} style={{
                  padding: '8px 16px', borderRadius: 'var(--cr-radius-sm)',
                  background: 'var(--sandstone)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 600,
                }}>
                  Cancel
                </button>
                <button
                  disabled={!eventForm.title.trim() || !eventForm.date || saving}
                  onClick={() => editingEvent ? updateGcalEvent(editingEvent.id, eventForm) : createGcalEvent(eventForm)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '8px 18px', borderRadius: 'var(--cr-radius-sm)',
                    background: !eventForm.title.trim() || !eventForm.date || saving ? 'var(--text-muted)' : 'var(--cr8w-primary)',
                    color: '#fff', border: 'none', cursor: !eventForm.title.trim() || !eventForm.date || saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 600,
                  }}
                >
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>

            {editingEvent?.htmlLink && (
              <a href={editingEvent.htmlLink} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 12,
                fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: 'var(--cr8w-primary)',
                textDecoration: 'none',
              }}>
                <ExternalLink size={11} /> Open in Google Calendar
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
