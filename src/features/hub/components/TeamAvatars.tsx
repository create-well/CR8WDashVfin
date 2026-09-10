import React, { useState, useEffect } from 'react';
import { PERSONS } from '../../../app/components/data';

interface TeamAvatarsProps {
  onNavigate: (view: string) => void;
}

const PROFILE_META: Record<string, { hdType: string; zone: string; craft: string }> = {
  sunshine: { hdType: 'ManiGen 5/1', zone: 'internal expression — the atmosphere architect', craft: 'space, atmosphere, playlists' },
  monny: { hdType: 'Generator 5/1', zone: 'systems, narrative, somatic', craft: 'systems, narrative, somatic' },
  bingle: { hdType: 'Projector 2/4', zone: 'lens, identity, visual story', craft: 'lens, identity, visual story' },
};

export function TeamAvatars({ onNavigate }: TeamAvatarsProps) {
  const [expandedProfileKey, setExpandedProfileKey] = useState<string | null>(null);
  const [profileHolding, setProfileHolding] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const k of ['sunshine', 'monny', 'bingle']) {
      try { out[k] = localStorage.getItem(`profile_holding_${k}`) || ''; } catch { out[k] = ''; }
    }
    return out;
  });

  useEffect(() => {
    if (!expandedProfileKey) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-card-expanded') && !target.closest('.hub-avatar-circle')) {
        setExpandedProfileKey(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expandedProfileKey]);

  return (
    <div className="hub-avatars-row" style={{ position: 'relative' }}>
      {Object.entries(PERSONS).map(([key, p]) => {
        const isExpanded = expandedProfileKey === key;
        const meta = PROFILE_META[key];
        const arriveVal = localStorage.getItem('arriveState');
        const energyLevel = arriveVal === 'fired' ? 3 : arriveVal === 'flowing' ? 2 : arriveVal === 'foggy' ? 1 : 0;
        
        return (
          <div key={key} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className="hub-avatar-circle"
              style={{ background: `${p.color}28`, borderColor: p.color, transition: 'transform 0.2s, box-shadow 0.2s', ...(isExpanded ? { transform: 'scale(1.12)', boxShadow: `0 0 0 3px ${p.color}40` } : {}) }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedProfileKey(isExpanded ? null : key);
              }}
              title={`${p.name}'s Profile`}
            >
              <span className="hub-avatar-emoji">{p.emoji}</span>
              <span className="hub-avatar-name">{p.name}</span>
            </button>

            {isExpanded && (
              <div
                className="profile-card-expanded"
                style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  width: 260, marginTop: 8, background: '#fff', borderRadius: 14,
                  border: `1.5px solid ${p.color}40`, boxShadow: `0 8px 28px rgba(0,0,0,0.10), 0 0 0 1px ${p.color}15`,
                  padding: '14px 16px', zIndex: 50, overflow: 'hidden', animation: 'profileCardIn 0.3s ease',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: '14px', fontWeight: 600, color: 'var(--cr8w-text, #2D2438)', marginBottom: 4, lineHeight: 1.3 }}>
                  {p.name} <span style={{ color: p.color, fontWeight: 500 }}>— {meta?.hdType}</span>
                </div>
                <div style={{ fontFamily: "var(--font-label)", fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted, #8A7D72)', lineHeight: 1.4, marginBottom: 10 }}>
                  {meta?.zone}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.56rem', fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 3 }}>currently holding</label>
                  <input
                    type="text"
                    value={profileHolding[key] || ''}
                    placeholder="what are you holding this week?"
                    onChange={e => {
                      const val = e.target.value;
                      setProfileHolding(prev => ({ ...prev, [key]: val }));
                      try { localStorage.setItem(`profile_holding_${key}`, val); } catch {}
                    }}
                    style={{
                      width: '100%', border: '1px solid var(--border-soft, #e0dcd7)', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem',
                      fontFamily: "var(--font-label)", color: 'var(--cr8w-text, #2D2438)', background: 'var(--cr8w-surface, #FAFAF8)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = p.color}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-soft, #e0dcd7)'}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.56rem', fontWeight: 700, color: 'var(--text-muted, #8A7D72)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>energy</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3].map(seg => (
                      <div key={seg} style={{
                        width: 22, height: 10, borderRadius: 3,
                        border: `1.5px solid ${energyLevel >= seg ? p.color : '#D5D0CB'}`,
                        background: energyLevel >= seg ? `${p.color}50` : 'transparent',
                        transition: 'all 0.2s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.52rem', color: 'var(--text-muted, #8A7D72)', fontStyle: 'italic' }}>
                    {energyLevel === 3 ? 'fired up' : energyLevel === 2 ? 'flowing' : energyLevel === 1 ? 'foggy' : 'not set'}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-label)", fontSize: '0.72rem', color: 'var(--cr8w-text, #2D2438)', opacity: 0.5, lineHeight: 1.3, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 8 }}>
                  {meta?.craft}
                </div>
                <button
                  onClick={() => { setExpandedProfileKey(null); onNavigate(key); }}
                  style={{
                    marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 8, border: `1px solid ${p.color}40`,
                    background: `${p.color}10`, color: p.color, fontFamily: 'var(--font-label)', fontSize: '0.62rem',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}
                >open {p.name.toLowerCase()}'s dashboard →</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
