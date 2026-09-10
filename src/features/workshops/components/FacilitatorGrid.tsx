import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Workshop } from '@/app/components/api';
import { PERSONS } from '@/app/components/data';
import { getSetting, setSetting } from '@/app/components/api';
import { DEFAULT_COFLOW_PROFILES, FACILITATOR_SPECIALTIES } from '../constants';
import type { CoFlowProfile } from '../types';

interface FacilitatorGridProps {
  workshops: Workshop[];
}

export function FacilitatorGrid({ workshops }: FacilitatorGridProps) {
  const facilitators = ['monny', 'sunshine', 'bingle'] as const;
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, CoFlowProfile>>(DEFAULT_COFLOW_PROFILES);
  const [editingField, setEditingField] = useState<{ person: string; field: string } | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const profilesLoaded = useRef(false);

  // Load profiles from KV on mount
  useEffect(() => {
    if (profilesLoaded.current) return;
    profilesLoaded.current = true;
    getSetting<Record<string, CoFlowProfile>>('coflow_profiles').then(res => {
      if (res?.value) {
        // Merge with defaults to ensure all keys exist
        const merged = { ...DEFAULT_COFLOW_PROFILES };
        for (const k of Object.keys(merged)) {
          if (res.value[k]) merged[k] = { ...merged[k], ...res.value[k] };
        }
        setProfiles(merged);
      }
    }).catch(e => console.error('Failed to load co-flow profiles:', e));
  }, []);

  // Save a single profile field
  function saveProfileField(person: string, field: keyof CoFlowProfile, value: any) {
    const updated = { ...profiles, [person]: { ...profiles[person], [field]: value } };
    setProfiles(updated);
    setSetting('coflow_profiles', updated).catch(e => console.error('Failed to save co-flow profiles:', e));
  }

  function startEdit(person: string, field: string, currentValue: string) {
    setEditingField({ person, field });
    setEditDraft(currentValue);
  }

  function commitEdit(person: string, field: keyof CoFlowProfile) {
    if (editDraft.trim()) {
      saveProfileField(person, field, editDraft.trim());
    }
    setEditingField(null);
    setEditDraft('');
  }

  // Find overlapping best days
  const sharedDays = profiles.monny.bestDays.filter(
    d => profiles.sunshine.bestDays.includes(d) || profiles.bingle.bestDays.includes(d)
  );

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-label)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
        Guide Profiles
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
        three guides, one flow — each committed to showing up in alignment with their energy and each other's
      </p>

      {/* ── Co-Flow Alignment Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(var(--cr8w-primary-rgb, 123,168,157),0.08), rgba(var(--cr8w-secondary-rgb, 184,169,212),0.08))',
        borderRadius: 'var(--cr-radius-md)', padding: '16px 20px', marginBottom: 20,
        border: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>🤝</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
            color: 'var(--cr8w-primary)',
          }}>
            co-flow commitment
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-secondary)',
          margin: '0 0 12px', lineHeight: 1.6, fontStyle: 'italic',
        }}>
          "we don't just show up for ourselves — we show up for each other's energy. our co-flow days are where all three rhythms meet."
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sharedDays.map(day => (
            <span key={day} style={{
              padding: '4px 12px', borderRadius: 10,
              background: 'var(--cr8w-primary)', color: '#fff',
              fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.3px',
            }}>
              {day}
            </span>
          ))}
          <span style={{
            padding: '4px 12px', borderRadius: 10,
            background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)',
            color: 'var(--cr8w-primary)',
            fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600,
            letterSpacing: '0.3px',
          }}>
            ✨ aligned days
          </span>
        </div>
      </div>

      {/* ── Guide Dropdown Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {facilitators.map(key => {
          const person = PERSONS[key];
          const profile = profiles[key];
          const personWorkshops = workshops.filter(w => w.facilitator === key);
          const upcoming = personWorkshops.filter(w => w.status === 'scheduled');
          const completed = personWorkshops.filter(w => w.status === 'completed');
          const specialties = FACILITATOR_SPECIALTIES[key] || [];
          const isExpanded = expandedGuide === key;

          return (
            <div key={key} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
              boxShadow: 'var(--shadow-sm)',
              border: isExpanded ? `1.5px solid ${person.color}66` : '1.5px solid var(--border-soft)',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.3s ease',
            }}>
              {/* Accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${person.color}, ${person.color}66)`,
              }} />

              {/* ── Clickable Header ── */}
              <button
                onClick={() => setExpandedGuide(isExpanded ? null : key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px 18px', paddingTop: 19, cursor: 'pointer',
                  background: 'none', border: 'none', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${person.color}, ${person.color}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>
                  {person.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {person.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', color: person.color, fontWeight: 600, letterSpacing: '0.3px' }}>
                    {profile.energyType}
                  </div>
                </div>
                {/* Stats mini */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--cr8w-primary)', fontWeight: 700 }}>
                      {upcoming.length}
                    </div>
                    <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      upcoming
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#7AB87A', fontWeight: 700 }}>
                      {completed.length}
                    </div>
                    <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      done
                    </div>
                  </div>
                </div>
                {/* Chevron */}
                <div style={{ flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                  <ChevronDown size={18} />
                </div>
              </button>

              {/* ── Expanded Content ── */}
              {isExpanded && (
                <div style={{
                  padding: '0 18px 20px', borderTop: '1px solid var(--border-soft)',
                  animation: 'cw-fadeInUp 0.25s ease',
                }}>
                  {/* Expression */}
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.78rem',
                    color: person.color, fontWeight: 600, marginTop: 14, marginBottom: 14,
                    fontStyle: 'italic',
                  }}>
                    "{person.expression}"
                  </div>

                  {/* Co-Flow Commitment */}
                  <div style={{
                    background: `${person.color}0C`, borderRadius: 10,
                    padding: '14px 16px', marginBottom: 16,
                    border: `1px solid ${person.color}22`,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-label)', fontSize: '0.65rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: person.color, marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>🫶</span> my co-flow commitment
                    </div>
                    {editingField?.person === key && editingField?.field === 'commitment' ? (
                      <textarea
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        onBlur={() => commitEdit(key, 'commitment')}
                        onKeyDown={e => { if (e.key === 'Escape') { setEditingField(null); setEditDraft(''); } }}
                        autoFocus
                        rows={3}
                        style={{
                          width: '100%', padding: '6px 8px', borderRadius: 6,
                          border: `1px solid ${person.color}44`, fontFamily: 'var(--font-body)',
                          fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'transparent',
                          resize: 'vertical', outline: 'none', fontStyle: 'italic', lineHeight: 1.6,
                        }}
                      />
                    ) : (
                      <p
                        onClick={() => startEdit(key, 'commitment', profile.commitment)}
                        title="Click to edit"
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: '0.8rem',
                          color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6,
                          fontStyle: 'italic', cursor: 'text',
                        }}
                      >
                        "{profile.commitment}"
                      </p>
                    )}
                  </div>

                  {/* Best Days + Flow Window */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        best co-flow days
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const active = profile.bestDays.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const next = active
                                  ? profile.bestDays.filter(d => d !== day)
                                  : [...profile.bestDays, day];
                                saveProfileField(key, 'bestDays', next);
                              }}
                              style={{
                                padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: active ? `${person.color}18` : 'var(--sandstone)',
                                color: active ? person.color : 'var(--text-muted)',
                                fontFamily: 'var(--font-label)', fontSize: '0.66rem', fontWeight: 600,
                                opacity: active ? 1 : 0.5, transition: 'all 0.15s',
                              }}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        flow window
                      </label>
                      {editingField?.person === key && editingField?.field === 'flowWindow' ? (
                        <input
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          onBlur={() => commitEdit(key, 'flowWindow')}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(key, 'flowWindow'); if (e.key === 'Escape') { setEditingField(null); setEditDraft(''); } }}
                          autoFocus
                          style={{
                            width: '100%', marginTop: 6, padding: '4px 6px', borderRadius: 4,
                            border: `1px solid ${person.color}44`, fontFamily: 'var(--font-body)',
                            fontSize: '0.82rem', color: 'var(--text-primary)', background: 'transparent',
                            outline: 'none', fontWeight: 500,
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(key, 'flowWindow', profile.flowWindow)}
                          title="Click to edit"
                          style={{
                            marginTop: 6, fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                            color: 'var(--text-primary)', fontWeight: 500, cursor: 'text',
                          }}
                        >
                          {profile.flowWindow}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Synergies */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      energy synergies
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {profile.synergies.map((syn, i) => {
                        const partner = PERSONS[syn.with];
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.04)',
                          }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              background: partner?.color || '#ccc',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem',
                            }}>
                              {partner?.emoji}
                            </span>
                            {editingField?.person === key && editingField?.field === `synergy-${i}` ? (
                              <input
                                value={editDraft}
                                onChange={e => setEditDraft(e.target.value)}
                                onBlur={() => {
                                  const updated = [...profile.synergies];
                                  updated[i] = { ...updated[i], note: editDraft.trim() || updated[i].note };
                                  saveProfileField(key, 'synergies', updated);
                                  setEditingField(null); setEditDraft('');
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.currentTarget.blur(); }
                                  if (e.key === 'Escape') { setEditingField(null); setEditDraft(''); }
                                }}
                                autoFocus
                                style={{
                                  flex: 1, padding: '2px 4px', borderRadius: 4,
                                  border: `1px solid ${person.color}44`, fontFamily: 'var(--font-body)',
                                  fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'transparent',
                                  outline: 'none', lineHeight: 1.5,
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => startEdit(key, `synergy-${i}`, syn.note)}
                                title="Click to edit"
                                style={{
                                  fontFamily: 'var(--font-body)', fontSize: '0.76rem',
                                  color: 'var(--text-secondary)', lineHeight: 1.5, cursor: 'text',
                                }}
                              >
                                {syn.note}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      specialties
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {specialties.map((s, i) => (
                        <span key={i} style={{
                          padding: '3px 10px', borderRadius: 10,
                          background: `${person.color}18`, color: person.color,
                          fontFamily: 'var(--font-label)', fontSize: '0.66rem', fontWeight: 600,
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming workshops list */}
                  {upcoming.length > 0 && (
                    <div>
                      <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        upcoming workshops
                      </label>
                      {upcoming.slice(0, 3).map(w => (
                        <div key={w.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0', borderBottom: '1px solid var(--border-soft)',
                          fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                        }}>
                          <span style={{ color: 'var(--text-primary)' }}>{w.title}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
