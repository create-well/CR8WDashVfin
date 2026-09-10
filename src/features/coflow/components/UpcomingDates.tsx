import React from 'react';
import { Clock, MapPin, Users, X, Calendar } from 'lucide-react';
import type { CoFlowDate, CalendarEventKV } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { cardStyle, labelStyle, formatD8, getTimeDisplay } from '../utils';

export function UpcomingDates({
  upcomingD8s,
  kvCalEvents,
  onDeleteCoFlowDate
}: {
  upcomingD8s: CoFlowDate[];
  kvCalEvents: CalendarEventKV[];
  onDeleteCoFlowDate: (id: number) => void;
}) {
  const otherUpcoming = upcomingD8s.slice(1);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcomingCalEvents = kvCalEvents
    .filter(ev => new Date(ev.start) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  if (otherUpcoming.length === 0 && upcomingCalEvents.length === 0) {
    return null;
  }

  return (
    <>
      {otherUpcoming.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <span style={labelStyle}>Also On Deck</span>
          {otherUpcoming.map(d8 => (
            <div key={d8.id} style={{ ...cardStyle, marginBottom: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatD8(d8.date)}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 4 }}>
                  <span><Clock size={12} /> {getTimeDisplay(d8)}</span>
                  <span><MapPin size={12} /> {d8.location || 'TBD'}</span>
                  {d8.host && <span><Users size={12} /> {PERSONS[d8.host]?.name || d8.host}</span>}
                </div>
              </div>
              <button onClick={() => onDeleteCoFlowDate(d8.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.4 }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {upcomingCalEvents.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={labelStyle}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Upcoming from Calendar
            </span>
            <a
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank" rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--cr8w-primary)',
                fontWeight: 600, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.3px',
              }}
            >Open Calendar ↗</a>
          </div>
          {upcomingCalEvents.map(ev => {
            const startDate = new Date(ev.start);
            const isToday = startDate.toDateString() === new Date().toDateString();
            const dateLabel = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeLabel = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
            return (
              <div key={ev.id} style={{
                ...cardStyle, marginBottom: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                background: isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)' : 'var(--bg-card)',
                border: isToday ? '1.5px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.25)' : '1px solid var(--border-soft)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: isToday ? 'var(--cr8w-primary)' : 'var(--camel-sun, #D4A771)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 600,
                    color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{ev.title}</div>
                  <div style={{
                    fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: 'var(--text-muted)',
                    display: 'flex', gap: 6, alignItems: 'center',
                  }}>
                    <span>{dateLabel}</span>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <span>{timeLabel}</span>
                    {ev.location && <><span style={{ opacity: 0.3 }}>·</span><span>{ev.location}</span></>}
                  </div>
                </div>
                {isToday && (
                  <span style={{
                    fontFamily: 'var(--font-label)', fontSize: '0.58rem', fontWeight: 700,
                    color: '#fff', background: 'var(--cr8w-primary)', borderRadius: 6, padding: '2px 6px',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}>Today</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
