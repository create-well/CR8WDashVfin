import React, { useState } from 'react';
import { PERSONS } from '../../../app/components/data';
import { SYNERGY_SECTIONS_DATA } from '../utils';

interface CollectiveSynergyProps {
  onNavigate: (view: string) => void;
}

export function CollectiveSynergy({ onNavigate }: CollectiveSynergyProps) {
  const [showSynergy, setShowSynergy] = useState(false);
  const [openSynergySections, setOpenSynergySections] = useState<Set<string>>(new Set());

  return (
    <div className="hub-section-sm">
      <div
        className="hub-synergy-header"
        onClick={() => setShowSynergy(!showSynergy)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowSynergy(!showSynergy); }}
      >
        <span>✨ Collective Synergy</span>
        <span className="hub-synergy-summary">ManiGen + Generator + Projector = Complete Creative Engine</span>
        <span className={`hub-chevron ${showSynergy ? 'open' : ''}`}>›</span>
      </div>
      <div className={`hub-synergy-body ${showSynergy ? 'open' : ''}`}>
        <div>
          <div className="hub-synergy-trio">
            {Object.entries(PERSONS).map(([key, p]) => (
              <button key={key} className="hub-synergy-member" style={{ borderTop: `3px solid ${p.color}` }} onClick={() => onNavigate(key)}>
                <span className="hub-synergy-emoji">{p.emoji}</span>
                <div className="hub-synergy-name">{p.name}</div>
                <div className="hub-synergy-role">{p.role.split('·')[0].trim()}</div>
              </button>
            ))}
          </div>
          <div className="hub-synergy-insights">
            {SYNERGY_SECTIONS_DATA.map((s) => {
              const isOpen = openSynergySections.has(s.id);
              return (
                <div key={s.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => {
                      const newSet = new Set(openSynergySections);
                      if (newSet.has(s.id)) newSet.delete(s.id);
                      else newSet.add(s.id);
                      setOpenSynergySections(newSet);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      background: isOpen ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)' : 'transparent',
                      border: isOpen ? '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)' : '1px solid var(--border-soft)',
                      borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-label)', fontSize: '0.78rem', fontWeight: 700, color: isOpen ? 'var(--cr8w-primary)' : 'var(--text-primary)', letterSpacing: '0.02em' }}>
                      {s.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>›</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '14px 14px 10px', borderLeft: '2px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.2)', marginLeft: 18, marginTop: 4 }}>
                      {s.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
