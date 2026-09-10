import React, { useState } from 'react';
import type { Station } from '../../../app/components/api';
import { PERSONS, capitalize } from '../../../app/components/data';
import { statusColors } from '../utils';
import { StationCard } from './StationCard';

interface StationsListProps {
  stations: Station[];
  onAddStation: (s: Omit<Station, 'id' | 'created_at'>) => void;
  onUpdateStationField: (id: number, updates: Partial<Station>) => void;
  onUpdateStationStatus: (id: number, status: string) => void;
  onUpdateStationOwner: (id: number, owner: string) => void;
  onDeleteStation: (id: number) => void;
}

export function StationsList({
  stations, onAddStation, onUpdateStationField,
  onUpdateStationStatus, onUpdateStationOwner, onDeleteStation
}: StationsListProps) {
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStation, setNewStation] = useState({ emoji: '🎨', name: '', description: '', status: 'Exploring', owner: 'monny' });

  return (
    <div className="geyser-tab-content">
      {/* Station summary */}
      <div className="geyser-station-summary">
        {Object.entries(statusColors).map(([status, colors]) => {
          const count = stations.filter(s => s.status === status).length;
          return (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot }} />
              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: colors.color }}>
                {count} {status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add station button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowAddStation(!showAddStation)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
          {showAddStation ? '✕ Cancel' : '+ Add Station'}
        </button>
      </div>

      {showAddStation && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newStation.emoji} onChange={e => setNewStation({ ...newStation, emoji: e.target.value })} placeholder="Emoji" style={{ width: 50, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-soft)', textAlign: 'center', fontSize: '1.2rem', background: 'transparent' }} />
            <input value={newStation.name} onChange={e => setNewStation({ ...newStation, name: e.target.value })} placeholder="Station name" style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', background: 'transparent', color: 'var(--text-primary)' }} />
          </div>
          <input value={newStation.description} onChange={e => setNewStation({ ...newStation, description: e.target.value })} placeholder="Description" style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', background: 'transparent', color: 'var(--text-primary)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={newStation.status} onChange={e => setNewStation({ ...newStation, status: e.target.value })} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', color: 'var(--text-primary)' }}>
              {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={newStation.owner} onChange={e => setNewStation({ ...newStation, owner: e.target.value })} style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', color: 'var(--text-primary)' }}>
              {Object.keys(PERSONS).map(k => <option key={k} value={k}>{capitalize(k)}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              if (newStation.name.trim()) {
                onAddStation({ emoji: newStation.emoji || '🎨', name: newStation.name.trim(), description: newStation.description.trim(), status: newStation.status, owner: newStation.owner });
                setNewStation({ emoji: '🎨', name: '', description: '', status: 'Exploring', owner: 'monny' });
                setShowAddStation(false);
              }
            }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
          >
            Add Station
          </button>
        </div>
      )}

      {stations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏕️</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            no stations yet — add one above to get started
          </div>
        </div>
      ) : (
        <div className="geyser-stations-grid">
          {stations.map(s => (
            <StationCard
              key={s.id}
              station={s}
              onUpdateStationField={onUpdateStationField}
              onUpdateStationStatus={onUpdateStationStatus}
              onUpdateStationOwner={onUpdateStationOwner}
              onDeleteStation={onDeleteStation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
