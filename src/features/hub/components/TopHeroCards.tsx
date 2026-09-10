import React, { useState, useEffect } from 'react';
import { CALENDAR_EVENTS, getDaysToLaunch } from '../../../app/components/data';
import type { Task, Station, CalendarEventKV, InviteCounts } from '../../../app/components/api';
import * as api from '../../../app/components/api';

interface TopHeroCardsProps {
  actionItems: Task[];
  stations: Station[];
  kvCalEvents: CalendarEventKV[];
  onNavigate: (view: string) => void;
  onNavigateGeyserStations: () => void;
}

export function TopHeroCards({ actionItems, stations, kvCalEvents, onNavigate, onNavigateGeyserStations }: TopHeroCardsProps) {
  const [inviteCounts, setInviteCounts] = useState<InviteCounts>({ confirmed: 0, pending: 0, declined: 0, maybe: 0, total: 0 });
  const [inviteLoaded, setInviteLoaded] = useState(false);

  useEffect(() => {
    api.getInviteCounts()
      .then(data => { setInviteCounts(data); setInviteLoaded(true); })
      .catch(e => { if (!(e instanceof TypeError)) console.error(e); setInviteLoaded(true); });
  }, []);

  const openTasks = actionItems.filter(t => t.status !== 'done');
  const confirmedStations = stations.filter(s => s.status === 'Confirmed').length;
  const totalStations = stations.length || 6;
  const todayStr = new Date().toISOString().split('T')[0];
  
  const staticMilestone = CALENDAR_EVENTS
    .filter(e => e.date >= todayStr && e.type !== 'personal')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const kvMilestone = kvCalEvents
    .filter(e => (e.start?.split('T')[0] || '') >= todayStr)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
    
  const nextMilestone = staticMilestone
    ? staticMilestone
    : kvMilestone
      ? { title: kvMilestone.title, date: kvMilestone.start.split('T')[0] }
      : null;
      
  const nextMilestoneLabel = nextMilestone
    ? `${nextMilestone.title.replace(/\s*🚀/, '')} · ${new Date(nextMilestone.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Launch day approaching';
    
  const assignedRoles = ['sunshine', 'monny', 'bingle'].filter(p => stations.some(s => s.owner === p));
  const rolesLabel = assignedRoles.length >= 3 ? 'roles assigned' : 'needs update';
  const daysToLaunch = getDaysToLaunch();

  const cardBase: React.CSSProperties = {
    borderRadius: 12, padding: 12, background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: 4,
    minHeight: 0, border: 'none',
    textAlign: 'left', fontFamily: 'var(--font-label)',
  };

  function MiniCard({ emoji, title, borderColor, badge, subtitle, onClick, children }: {
    emoji: string; title: string; borderColor: string; badge?: number | string; subtitle: string;
    onClick: () => void; children?: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        style={{ ...cardBase, borderLeft: `3px solid ${borderColor}` }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.10)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1rem' }}>{emoji}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cr8w-text, #2D2438)', letterSpacing: '0.01em' }}>{title}</span>
          </div>
          {badge !== undefined && (
            <span style={{
              background: borderColor, color: '#fff', borderRadius: 10,
              padding: '1px 8px', fontSize: '0.66rem', fontWeight: 700,
              minWidth: 20, textAlign: 'center',
            }}>{badge}</span>
          )}
        </div>
        {children}
        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted, #8A7D72)', fontWeight: 500, lineHeight: 1.3 }}>{subtitle}</div>
      </button>
    );
  }

  return (
    <div className="geyser-mini-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 10,
      margin: '0 0 8px',
    }}>
      <style>{`@media (max-width: 520px) { .geyser-mini-grid { grid-template-columns: 1fr !important; } }`}</style>
      <MiniCard
        emoji={'📋'}
        title="Moves"
        borderColor="var(--cr8w-primary, #7BA89D)"
        badge={openTasks.length}
        subtitle={`${openTasks.length} in motion this week`}
        onClick={() => onNavigate('geyser')}
      />
      <MiniCard
        emoji={'📍'}
        title="Stations"
        borderColor="var(--cr8w-secondary, #B8A9D4)"
        badge={confirmedStations}
        subtitle={`${confirmedStations} of ${totalStations} confirmed`}
        onClick={() => onNavigateGeyserStations()}
      />
      <MiniCard
        emoji={'📨'}
        title="Guests"
        borderColor="#6BAF6B"
        badge={inviteLoaded ? inviteCounts.confirmed : '—'}
        subtitle={inviteLoaded && inviteCounts.total > 0 ? `${inviteCounts.confirmed} confirmed of ${inviteCounts.total}` : 'synced from invite sheet'}
        onClick={() => onNavigate('geyser')}
      />
      <MiniCard
        emoji={'👥'}
        title="Team"
        borderColor="#E8C875"
        subtitle={rolesLabel}
        onClick={() => onNavigate('geyser')}
      >
        <div style={{ display: 'flex', marginTop: 2, marginBottom: 2 }}>
          {[
            { key: 'sunshine', emoji: '☀️', color: '#D4A5A5' },
            { key: 'monny', emoji: '🌊', color: '#7BA89D' },
            { key: 'bingle', emoji: '✨', color: '#B8A9D4' },
          ].map((p, i) => (
            <div key={p.key} style={{
              width: 24, height: 24, borderRadius: '50%',
              background: `${p.color}33`, border: `1.5px solid ${p.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', marginLeft: i > 0 ? -4 : 0,
              position: 'relative', zIndex: 3 - i,
            }}>{p.emoji}</div>
          ))}
        </div>
      </MiniCard>
      <MiniCard
        emoji={'⏱️'}
        title="Timeline"
        borderColor="#D4A0A0"
        subtitle={nextMilestoneLabel}
        onClick={() => onNavigate('geyser')}
      >
        <div style={{
          fontSize: '1.2rem', fontWeight: 800, color: 'var(--cr8w-text, #2D2438)',
          fontFamily: "var(--font-display)", lineHeight: 1.1,
          marginTop: 1, marginBottom: 1,
        }}>{daysToLaunch} days</div>
      </MiniCard>
    </div>
  );
}
