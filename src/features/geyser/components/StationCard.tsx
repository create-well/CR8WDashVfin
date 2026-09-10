import React from 'react';
import type { Station } from '../../../app/components/api';
import { PERSONS, capitalize } from '../../../app/components/data';
import { InlineEdit } from './InlineEdit';
import { statusColors } from '../utils';

interface StationCardProps {
  station: Station;
  onUpdateStationField: (id: number, updates: Partial<Station>) => void;
  onUpdateStationStatus: (id: number, status: string) => void;
  onUpdateStationOwner: (id: number, owner: string) => void;
  onDeleteStation: (id: number) => void;
}

export function StationCard({
  station: s, onUpdateStationField, onUpdateStationStatus,
  onUpdateStationOwner, onDeleteStation
}: StationCardProps) {
  const sc = statusColors[s.status] || statusColors['TBD'];
  const owner = PERSONS[s.owner];

  return (
    <div className="geyser-station-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.4rem' }}>{s.emoji}</span>
          <InlineEdit
            value={s.name}
            onSave={v => onUpdateStationField(s.id, { name: v })}
            style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}
          />
        </div>
        <button onClick={() => onDeleteStation(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', padding: 4 }}>🗑</button>
      </div>
      <InlineEdit
        value={s.description}
        onSave={v => onUpdateStationField(s.id, { description: v })}
        multiline
        style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'block', marginBottom: 10 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select
          value={s.status}
          onChange={e => onUpdateStationStatus(s.id, e.target.value)}
          style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: sc.bg, color: sc.color, fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {Object.keys(statusColors).map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <select
          value={s.owner}
          onChange={e => onUpdateStationOwner(s.id, e.target.value)}
          style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-label)', fontSize: '0.68rem', background: 'transparent', color: owner?.color || 'var(--text-secondary)', cursor: 'pointer' }}
        >
          {Object.keys(PERSONS).map(k => <option key={k} value={k}>{capitalize(k)}</option>)}
        </select>
      </div>
    </div>
  );
}
