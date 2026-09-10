import React, { useState } from 'react';
import { CALENDAR_EVENTS, PERSONS, capitalize } from '../../../app/components/data';
import type { CalendarEventKV, CoFlowDate, CoFlowCheckin } from '../../../app/components/api';

interface UpcomingEventsProps {
  kvCalEvents: CalendarEventKV[];
  coFlowDates: CoFlowDate[];
  coFlowCheckins: CoFlowCheckin[];
  onNavigate: (view: string) => void;
}

type UpcomingEvent = {
  key: string;
  date: Date;
  dateStr: string;
  title: string;
  time: string;
  location?: string;
  type: 'bhd' | 'cr8w' | 'personal' | 'launch';
  persons: string[];
  coFlowDate?: CoFlowDate;
  hasCheckin?: boolean;
  checkinCount?: number;
  description?: string;
};

export function UpcomingEvents({ kvCalEvents, coFlowDates, coFlowCheckins, onNavigate }: UpcomingEventsProps) {
  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const staticCalEvents: UpcomingEvent[] = CALENDAR_EVENTS
    .map(e => ({ ...e, dateObj: new Date(e.date + 'T00:00:00') }))
    .filter(e => e.dateObj >= todayDate)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 8)
    .map((e, i) => {
      let coFlowMatch: CoFlowDate | undefined;
      if (e.type === 'bhd') {
        coFlowMatch = coFlowDates.find(cf =>
          cf.date === e.date && (cf.status === 'upcoming' || cf.status === 'active')
        );
      }
      const checkins = coFlowMatch
        ? coFlowCheckins.filter(c => c.weekOf === coFlowMatch!.date)
        : [];
      return {
        key: `cal-${i}-${e.date}`,
        date: e.dateObj,
        dateStr: e.date,
        title: e.title,
        time: e.time || '',
        location: e.location,
        type: e.type,
        persons: e.persons,
        coFlowDate: coFlowMatch,
        hasCheckin: checkins.length > 0,
        checkinCount: checkins.length,
      };
    });

  const kvSeen = new Set<string>();
  const kvCalDeduped = kvCalEvents.filter(ev => {
    const canonical = ev.id.replace(/^kv-/, '');
    if (kvSeen.has(canonical)) return false;
    kvSeen.add(canonical);
    return true;
  });

  const kvEvents: UpcomingEvent[] = kvCalDeduped
    .map(ev => {
      const startDate = new Date(ev.start);
      const dateStr = ev.start.split('T')[0] || startDate.toISOString().split('T')[0];
      const time = startDate.getTime() ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '';
      return {
        key: `kv-${ev.id}`,
        date: startDate,
        dateStr,
        title: ev.title,
        time,
        location: ev.location || undefined,
        type: 'cr8w' as const,
        persons: ev.creator ? [ev.creator] : [],
        description: ev.description,
      };
    })
    .filter(e => e.date >= todayDate);

  const seenKeys = new Set(staticCalEvents.map(e => `${e.dateStr}::${e.title}`));
  const dedupedKv = kvEvents.filter(e => !seenKeys.has(`${e.dateStr}::${e.title}`));
  const calEvents = [...staticCalEvents, ...dedupedKv];

  const calBhdDates = new Set(calEvents.filter(e => e.type === 'bhd').map(e => e.dateStr));
  const extraCoFlow: UpcomingEvent[] = coFlowDates
    .filter(cf => !calBhdDates.has(cf.date) && (cf.status === 'upcoming' || cf.status === 'active'))
    .filter(cf => new Date(cf.date + 'T00:00:00') >= todayDate)
    .map((cf, i) => {
      const checkins = coFlowCheckins.filter(c => c.weekOf === cf.date);
      return {
        key: `cf-${cf.id}`,
        date: new Date(cf.date + 'T00:00:00'),
        dateStr: cf.date,
        title: cf.theme ? `behind h0es doors — "${cf.theme}"` : 'behind h0es doors',
        time: cf.startTime && cf.endTime ? `${cf.startTime} – ${cf.endTime}` : cf.timeRange || '',
        location: cf.location,
        type: 'bhd' as const,
        persons: ['sunshine', 'monny', 'bingle'],
        coFlowDate: cf,
        hasCheckin: checkins.length > 0,
        checkinCount: checkins.length,
      };
    });

  const allUpcoming = [...calEvents, ...extraCoFlow]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  if (allUpcoming.length === 0) return null;

  const TYPE_BADGE: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
    bhd: { emoji: '🚪', label: 'BHD', bg: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.1)', color: 'var(--cr8w-primary, #7BA89D)' },
    cr8w: { emoji: '🌀', label: 'CR8W', bg: 'rgba(var(--cr8w-secondary-rgb, 184,169,212),0.15)', color: '#8A6A20' },
    personal: { emoji: '🧘', label: 'Personal', bg: 'rgba(139,181,196,0.12)', color: '#3A6A8A' },
    launch: { emoji: '🚀', label: 'LAUNCH', bg: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)', color: 'var(--cr8w-primary, #7BA89D)' },
  };

  function formatRelDate(d: Date): string {
    const diff = Math.ceil((d.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return diff <= 6 ? `${dayName}, ${dateStr}` : dateStr;
  }

  function buildGCalUrl(ev: UpcomingEvent): string {
    const d = ev.dateStr.replace(/-/g, '');
    return `https://www.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${d}/${d}&details=${encodeURIComponent('CR8W Dashboard Event')}`;
  }

  return (
    <div style={{
      background: 'var(--cr8w-surface, #FFF8F2)',
      border: '1.5px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.1)',
      borderRadius: 16,
      padding: '14px 16px',
      marginTop: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: '0.92rem', fontWeight: 600, color: 'var(--cr8w-text, #2C1C10)' }}>📅 next up · shared/community events</span>
        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 500 }}>{allUpcoming.length} upcoming</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allUpcoming.map((ev, idx) => {
          const badge = TYPE_BADGE[ev.type] || TYPE_BADGE.personal;
          const isExpanded = expandedEventIdx === idx;
          const relDate = formatRelDate(ev.date);
          const isToday = relDate === 'Today';
          const isTomorrow = relDate === 'Tomorrow';
          const isBHD = ev.type === 'bhd';
          const needsCheckin = isBHD && ev.coFlowDate && !ev.hasCheckin;

          return (
            <div key={ev.key} style={{
              background: isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)' : 'var(--cr8w-surface, #fff)',
              border: isToday ? '1.5px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.25)' : '1px solid rgba(var(--cr8w-text-rgb, 44,28,16),0.06)',
              borderRadius: 12, overflow: 'hidden', transition: 'all 0.15s',
            }}>
              <div onClick={() => setExpandedEventIdx(isExpanded ? null : idx)} style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  background: isToday ? 'var(--cr8w-primary, #7BA89D)' : isTomorrow ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)' : 'rgba(var(--cr8w-text-rgb, 44,28,16),0.05)',
                  color: isToday ? '#fff' : isTomorrow ? 'var(--cr8w-primary, #7BA89D)' : 'var(--cr8w-text, #2C1C10)',
                  borderRadius: 8, padding: '4px 8px', fontFamily: 'var(--font-label)', fontSize: '0.62rem',
                  fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.02em',
                }}>{relDate}</div>

                <span style={{
                  background: badge.bg, color: badge.color, borderRadius: 6, padding: '2px 6px',
                  fontFamily: 'var(--font-label)', fontSize: '0.55rem', fontWeight: 700, whiteSpace: 'nowrap',
                  flexShrink: 0, letterSpacing: '0.03em', textTransform: 'uppercase',
                }}>{badge.emoji} {badge.label}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-label)", fontSize: '0.82rem', color: '#2C1C10', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                    {ev.time && <span>{ev.time}</span>}
                    {ev.location && <><span style={{ opacity: 0.3 }}>·</span><span>{ev.location}</span></>}
                  </div>
                </div>

                {needsCheckin && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9500', flexShrink: 0 }} title="Check-in needed" />}
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(44,28,16,0.06)', padding: '10px 12px 12px', background: 'rgba(255,255,255,0.5)', animation: 'cw-fadeInUp 0.2s ease' }}>
                  <div style={{ marginBottom: 10 }}>
                    {isBHD && ev.coFlowDate && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ev.coFlowDate.theme && <div style={{ fontFamily: "var(--font-label)", fontSize: '0.82rem', color: 'var(--cr8w-primary, #7BA89D)', fontStyle: 'italic' }}>"{ev.coFlowDate.theme}"</div>}
                        {ev.coFlowDate.host && (
                          <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            Hosted by <strong style={{ color: PERSONS[ev.coFlowDate.host]?.color || '#2C1C10' }}>{PERSONS[ev.coFlowDate.host]?.emoji} {capitalize(ev.coFlowDate.host)}</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          {ev.coFlowDate.location && <span>📍 {ev.coFlowDate.location}</span>}
                          {ev.coFlowDate.agendaItems?.length > 0 && <span>📋 {ev.coFlowDate.agendaItems.length} agenda item{ev.coFlowDate.agendaItems.length !== 1 ? 's' : ''}</span>}
                          {ev.checkinCount !== undefined && ev.checkinCount > 0 && <span>✅ {ev.checkinCount}/3 check-in{ev.checkinCount !== 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    )}
                    {!isBHD && (
                      <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ev.persons.map(p => <span key={p} style={{ color: PERSONS[p]?.color || '#2C1C10' }}>{PERSONS[p]?.emoji} {capitalize(p)}</span>)}
                        {ev.location && <span>📍 {ev.location}</span>}
                      </div>
                    )}
                  </div>

                  {needsCheckin && (
                    <div onClick={() => onNavigate('coflow')} style={{ background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.25)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9rem' }}>⚠️</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: '0.78rem', color: '#8A6A20', fontWeight: 600 }}>Check-in needed</div>
                        <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: 'rgba(138,106,32,0.7)' }}>Submit your PlayD8s check-in: time confirmation, agenda items & vibe</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#8A6A20', flexShrink: 0, fontWeight: 600 }}>→</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a href={buildGCalUrl(ev)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(26,115,232,0.08)', border: '1px solid rgba(26,115,232,0.2)', color: '#1A73E8', fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600, textDecoration: 'none' }}>📅 Google Calendar</a>
                    {isBHD && <button onClick={e => { e.stopPropagation(); onNavigate('coflow'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)', border: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.2)', color: 'var(--cr8w-primary, #7BA89D)', fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>🚪 Open PlayD8s</button>}
                    {(ev.type === 'cr8w' || ev.type === 'launch') && <button onClick={e => { e.stopPropagation(); onNavigate('geyser'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(212,167,113,0.1)', border: '1px solid rgba(212,167,113,0.25)', color: '#8A6A20', fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>⛲️ Open Geyser</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
