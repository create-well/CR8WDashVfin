import React, { useState, useEffect } from 'react';
import { PERSONS, MILESTONES, getDaysToLaunch, capitalize, formatTimestamp, type NoteItem } from '../../../app/components/data';
import type { Task, Station, Announcement, CalendarEventKV, InviteCounts } from '../../../app/components/api';
import * as api from '../../../app/components/api';
import { HowWeFlowReference } from '../../../app/components/HowWeFlowReference';
import type { GeyserTab } from '../types';

interface TaskOverviewProps {
  onNavigate: (view: string) => void;
  announcements: Announcement[];
  onDismissAnnouncement: (id: number) => void;
  onAddAnnouncement: () => void;
  stations: Station[];
  actionItems: Task[];
  setActiveTab: (tab: GeyserTab) => void;
  wellNotes: NoteItem[];
  onAddNote: (content: string, author: string) => void;
}

export function TaskOverview({
  onNavigate, announcements, onDismissAnnouncement, onAddAnnouncement,
  stations, actionItems, setActiveTab, wellNotes, onAddNote
}: TaskOverviewProps) {
  const [noteInput, setNoteInput] = useState('');

  // Invite counts from Google Sheet (via KV)
  const [inviteCounts, setInviteCounts] = useState<InviteCounts>({ confirmed: 0, pending: 0, declined: 0, maybe: 0, total: 0 });
  const [inviteLoaded, setInviteLoaded] = useState(false);

  useEffect(() => {
    api.getInviteCounts()
      .then(data => { setInviteCounts(data); setInviteLoaded(true); })
      .catch(e => { if (!(e instanceof TypeError)) console.error(e); setInviteLoaded(true); });
  }, []);

  // Calendar events from KV (synced from shared Google Calendar)
  const [kvCalEvents, setKvCalEvents] = useState<CalendarEventKV[]>([]);
  const [kvCalLoaded, setKvCalLoaded] = useState(false);
  useEffect(() => {
    api.getCalendarEvents()
      .then(data => { setKvCalEvents(data || []); setKvCalLoaded(true); })
      .catch(e => { if (!(e instanceof TypeError)) console.error(e); setKvCalLoaded(true); });
  }, []);

  const daysToLaunch = getDaysToLaunch();
  const confirmedStations = stations.filter(s => s.status === 'Confirmed').length;
  const highPriority = actionItems.filter(t => t.priority === 'high' && t.status !== 'done').length;
  const doneCount = MILESTONES.filter(m => m.done).length;

  return (
    <div className="geyser-tab-content">
      {announcements.length > 0 && (
        <div className="geyser-announcements-banner">
          <div className="gab-header">
            <span className="gab-icon">🔥</span>
            <span className="gab-title">Top Priority Right Now</span>
            <button className="gab-add-btn" onClick={onAddAnnouncement}>+</button>
          </div>
          <div className="gab-list">
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className="gab-item">
                <span className={`gcc-priority-badge ${a.priority}`}>{a.priority.toUpperCase()}</span>
                <span className="gab-text">{a.text}</span>
                <button className="gab-dismiss" onClick={() => onDismissAnnouncement(a.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="geyser-big-countdown">
        <div className="gbc-num">{daysToLaunch}</div>
        <div className="gbc-label">days until<br />April 15, 2026</div>
      </div>

      {/* Key Dates mini-timeline */}
      <div className="geyser-key-dates card">
        <div className="geyser-key-dates-header">
          <h3 className="geyser-section-title" style={{ marginBottom: 0 }}>📅 Key Dates</h3>
          <a
            href="https://calendar.google.com/calendar/u/0/r"
            target="_blank" rel="noopener noreferrer"
            className="hub-gcal-open"
          >Google Calendar ↗</a>
        </div>
        {(() => {
          const now = new Date(); now.setHours(0, 0, 0, 0);
          // Deduplicate by canonical ID (strip leading 'kv-' prefix if present)
          const seen = new Set<string>();
          const deduped = kvCalEvents.filter(ev => {
            const canonical = ev.id.replace(/^kv-/, '');
            if (seen.has(canonical)) return false;
            seen.add(canonical);
            return true;
          });
          const upcoming = deduped
            .filter(ev => new Date(ev.start) >= now)
            .sort((a, b) => a.start.localeCompare(b.start))
            .slice(0, 6);
          if (!kvCalLoaded) {
            return (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
                loading calendar…
              </div>
            );
          }
          if (upcoming.length === 0) {
            return (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                no upcoming events — add events to the shared Google Calendar to see them here
              </div>
            );
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {upcoming.map(ev => {
                const startDate = new Date(ev.start);
                const isToday = startDate.toDateString() === new Date().toDateString();
                const dateLabel = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeLabel = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                return (
                  <div key={ev.id.replace(/^kv-/, '')} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, background: isToday ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)' : 'transparent',
                    border: isToday ? '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.2)' : '1px solid transparent',
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
          );
        })()}
      </div>

      {/* ── Monthly Rhythm Calendar (feature 2) ───────────────────────── */}
      <div className="geyser-section">
        <h3 className="geyser-section-title">🥁 Monthly Rhythm</h3>
        <div className="card" style={{ padding: '16px 18px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.77rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5, fontStyle: 'italic' }}>
            One Cohoe session sets the whole month. We batch so we can flow the rest.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { weeks: 'Wk 1–2', label: 'Open Studio / Drop-in',    icon: '🎨', color: '#7BA89D', note: 'Recurring open door — community arrival, low-barrier entry' },
              { weeks: 'Wk 3',   label: 'Workshop',                  icon: '🔧', color: '#D4A771', note: 'Every 3rd month this slot becomes a full Geyser event' },
              { weeks: 'Wk 4',   label: 'Reflect + Batch in Cohoe',  icon: '🌿', color: '#B8A9D4', note: 'Team reflection · Cohoe plans and batches the next month together' },
            ].map(row => (
              <div key={row.weeks} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 12px', borderRadius: 8, background: `${row.color}12`, border: `1px solid ${row.color}35` }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44, paddingTop: 2 }}>
                  <span style={{ fontSize: '1.1rem' }}>{row.icon}</span>
                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.54rem', fontWeight: 700, color: row.color, letterSpacing: '0.04em', marginTop: 2 }}>{row.weeks}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.8rem', fontWeight: 700, color: row.color, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.71rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{row.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 11, padding: '7px 12px', borderRadius: 6, background: 'rgba(194,91,56,0.06)', border: '1px solid rgba(194,91,56,0.14)', fontFamily: 'var(--font-label)', fontSize: '0.67rem', color: '#C25B38', lineHeight: 1.5 }}>
            🗓 <strong>Cohoe default:</strong> Month-end batch session — Google Calendar auto-populates this cadence when connected.
          </div>
        </div>
      </div>

      <div className="geyser-stats-grid">
        <a href="https://docs.google.com/spreadsheets/d/1yTemDgbFQG3SdkD8uy-0v1Ogc0XIyS2sWj-iR-xLToc/edit" target="_blank" rel="noopener noreferrer" className="geyser-stat-card">
          <div className="geyser-stat-num">{inviteLoaded ? inviteCounts.confirmed : '—'}</div>
          <div className="geyser-stat-label">Confirmed<br />Guests</div>
          <div className="geyser-stat-sub">{inviteLoaded && inviteCounts.total > 0 ? `of ${inviteCounts.total} invited` : 'synced from invite sheet'}</div>
          <span className="geyser-stat-action">Open Sheet ↗</span>
        </a>
        <a href="https://drive.google.com/drive/folders/1d9OyYZusS0yyYsfwtjLkz1ss0KYPzl5a" target="_blank" rel="noopener noreferrer" className="geyser-stat-card">
          <div className="geyser-stat-num">—</div>
          <div className="geyser-stat-label">Sponsorship<br />Raised</div>
          <div className="geyser-stat-sub">tracking in progress</div>
          <span className="geyser-stat-action">CW Drive ↗</span>
        </a>
        <button className="geyser-stat-card" onClick={() => setActiveTab('stations')} style={{ textAlign: 'center', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}>
          <div className="geyser-stat-num">{confirmedStations}</div>
          <div className="geyser-stat-label">Stations<br />Confirmed</div>
          <div className="geyser-stat-sub">of {stations.length} total</div>
          <span className="geyser-stat-action">View Stations →</span>
        </button>
        <button className="geyser-stat-card urgent" onClick={() => setActiveTab('tasks')} style={{ textAlign: 'center', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }}>
          <div className="geyser-stat-num">{highPriority}</div>
          <div className="geyser-stat-label">High Priority<br />Open Moves</div>
          <div className="geyser-stat-sub">need energy</div>
          <span className="geyser-stat-action">View Moves →</span>
        </button>
      </div>

      {MILESTONES.length > 0 && (
      <div className="geyser-section">
        <h3 className="geyser-section-title">🚀 Launch Milestones</h3>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doneCount} of {MILESTONES.length} complete</span>
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(doneCount / MILESTONES.length * 100)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--sandstone)', overflow: 'hidden' }}>
            <div style={{ width: `${(doneCount / MILESTONES.length) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--cr8w-primary)', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {MILESTONES.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.9rem' }}>{m.done ? '✅' : '⬜'}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: m.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Invite Pipeline */}
      <div className="geyser-section">
        <h3 className="geyser-section-title">📊 Invite Pipeline</h3>
        <div className="card">
          {inviteLoaded ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6BAF6B' }} />
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: '#3A7A3A' }}>
                  {inviteCounts.confirmed} Confirmed
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4A771' }} />
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: '#8A6A20' }}>
                  {inviteCounts.pending} Pending
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A89888' }} />
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: '#666' }}>
                  {inviteCounts.declined} Declined
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A9D6F8' }} />
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: '#3A6A8A' }}>
                  {inviteCounts.maybe} Maybe
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ccc' }} />
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: '#666' }}>
                  {inviteCounts.total} Total
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              invite tracking will populate here as RSVPs come in
            </div>
          )}
        </div>
      </div>

      {/* Team Vibes */}
      <div className="geyser-section">
        <h3 className="geyser-section-title">👥 Team</h3>
        <div className="geyser-team-grid">
          {Object.entries(PERSONS).map(([key, person]) => {
            const personTasks = actionItems.filter(t => t.person === key && t.status !== 'done');
            return (
              <button key={key} className="geyser-team-card" onClick={() => onNavigate(key)} style={{ border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {person.emoji}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: person.color }}>{person.name}</div>
                    <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.3px' }}>{person.role.split('·')[0].trim()}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {personTasks.length} open move{personTasks.length !== 1 ? 's' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Well Notes */}
      <div className="geyser-section">
        <h3 className="geyser-section-title">📝 Notes from the Well</h3>
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="share a thought, reflection, or intention…"
              onKeyDown={e => {
                if (e.key === 'Enter' && noteInput.trim()) {
                  onAddNote(noteInput.trim(), 'monny');
                  setNoteInput('');
                }
              }}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', color: 'var(--text-primary)' }}
            />
            <button
              onClick={() => { if (noteInput.trim()) { onAddNote(noteInput.trim(), 'monny'); setNoteInput(''); } }}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Drop
            </button>
          </div>
          {wellNotes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontStyle: 'italic', padding: '16px 0' }}>
              no notes yet — drop one in to start the flow
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wellNotes.slice(0, 6).map((n, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.05)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {n.content}
                  {n.created_at && <span style={{ display: 'block', marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatTimestamp(n.created_at)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── How We Flow Reference (collapsible, feature 5) ───────────── */}
      <HowWeFlowReference />
    </div>
  );
}
