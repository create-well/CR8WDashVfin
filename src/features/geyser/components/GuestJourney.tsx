import React from 'react';
import { GUEST_JOURNEY } from '../../../app/components/data';

export function GuestJourney() {
  if (GUEST_JOURNEY.length === 0) {
    return (
      <div className="geyser-tab-content">
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗺️</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>Guest Journey</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            journey stages will appear here as they're configured
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="geyser-tab-content">
      <div className="geyser-section">
        <h3 className="geyser-section-title">🗺️ Guest Journey Map</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {GUEST_JOURNEY.map((stage: any, i: number) => (
            <div key={i} className="card" style={{ borderLeft: `3px solid ${stage.color || 'var(--cr8w-primary)'}` }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: stage.color || 'var(--cr8w-primary)', marginBottom: 6 }}>
                {stage.emoji} {stage.name}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {stage.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
