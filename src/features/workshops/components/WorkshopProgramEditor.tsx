import React, { useState } from 'react';
import { Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { WorkshopProgram } from '@/app/components/api';

interface WorkshopProgramEditorProps {
  programs: WorkshopProgram[];
  showAddForm: boolean;
  onToggleAdd: () => void;
  onAddProgram: (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => void;
  onDeleteProgram: (id: number) => void;
  expandedProgram: number | null;
  onToggleExpand: (id: number) => void;
}

export function WorkshopProgramEditor({ programs, showAddForm, onToggleAdd, onAddProgram, onDeleteProgram, expandedProgram, onToggleExpand }: WorkshopProgramEditorProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-label)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', margin: 0 }}>
          Offerings
        </h2>
        <button onClick={onToggleAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 'var(--cr-radius-md)',
          background: 'var(--cr8w-primary)', color: '#fff',
          fontFamily: 'var(--font-label)', fontSize: '0.8rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
        }}>
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : '+ new offering'}
        </button>
      </div>

      {showAddForm && <AddProgramForm onSubmit={onAddProgram} />}

      {programs.length === 0 && !showAddForm && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          border: '1px solid var(--border-soft)',
        }}>
          No offerings yet. Plant one to start growing your workshop series.
        </div>
      )}

      {programs.map(prog => (
        <div key={prog.id} style={{
          background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
          marginBottom: 12, boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-soft)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div
            onClick={() => onToggleExpand(prog.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 18px', cursor: 'pointer',
            }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                {prog.seriesName}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {prog.sessionOutline?.length || 0} sessions · {prog.facilitator}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); onDeleteProgram(prog.id); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--text-muted)', opacity: 0.5,
              }}>
                <Trash2 size={14} />
              </button>
              {expandedProgram === prog.id ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </div>
          </div>

          {/* Expanded content */}
          {expandedProgram === prog.id && (
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border-soft)' }}>
              {/* Description */}
              {prog.description && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Description
                  </label>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.6 }}>
                    {prog.description}
                  </p>
                </div>
              )}

              {/* Learning Objectives */}
              {prog.learningObjectives?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Learning Objectives
                  </label>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    {prog.learningObjectives.map((obj, i) => (
                      <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Session Outline */}
              {prog.sessionOutline?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Session Outline
                  </label>
                  <div style={{ marginTop: 8 }}>
                    {prog.sessionOutline.map((session, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--cr8w-primary)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {session.number}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {session.title}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>
                            {session.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Audience & Materials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
                {prog.targetAudience && (
                  <div>
                    <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Target Audience
                    </label>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      {prog.targetAudience}
                    </p>
                  </div>
                )}
                {prog.materialsNeeded?.length > 0 && (
                  <div>
                    <label style={{ fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Materials Needed
                    </label>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {prog.materialsNeeded.map((m, i) => (
                        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AddProgramForm({ onSubmit }: { onSubmit: (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => void }) {
  const [seriesName, setSeriesName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [materials, setMaterials] = useState('');
  const [facilitator, setFacilitator] = useState('monny');
  const [sessions, setSessions] = useState<{ title: string; description: string }[]>([{ title: '', description: '' }]);

  function addSession() { setSessions([...sessions, { title: '', description: '' }]); }
  function updateSession(idx: number, field: string, value: string) {
    const updated = [...sessions];
    (updated[idx] as any)[field] = value;
    setSessions(updated);
  }
  function removeSession(idx: number) { setSessions(sessions.filter((_, i) => i !== idx)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seriesName.trim()) return;
    onSubmit({
      seriesName: seriesName.trim(),
      description: description.trim(),
      learningObjectives: objectives.split('\n').map(o => o.trim()).filter(Boolean),
      sessionOutline: sessions.filter(s => s.title.trim()).map((s, i) => ({ number: i + 1, title: s.title.trim(), description: s.description.trim() })),
      targetAudience: targetAudience.trim(),
      materialsNeeded: materials.split('\n').map(m => m.trim()).filter(Boolean),
      facilitator,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    borderRadius: 'var(--cr-radius-sm)', border: '1.5px solid var(--border-soft)',
    background: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
    color: 'var(--text-primary)',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)', fontSize: '0.72rem',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 600,
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
      padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-soft)', animation: 'cw-fadeInUp 0.3s ease',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Series Name *</label>
          <input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="e.g. Embodied Expression Series" style={inputStyle} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Program overview..." style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Facilitator</label>
          <select value={facilitator} onChange={e => setFacilitator(e.target.value)} style={inputStyle}>
            <option value="monny">Monny</option>
            <option value="sunshine">Sunshine</option>
            <option value="bingle">Bingle</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Target Audience</label>
          <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. Creative professionals" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Learning Objectives (one per line)</label>
          <textarea value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="One objective per line..." style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Materials Needed (one per line)</label>
          <textarea value={materials} onChange={e => setMaterials(e.target.value)} placeholder="One material per line..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
        </div>
      </div>

      {/* Session outline builder */}
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Session Outline</label>
        {sessions.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start',
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--cr8w-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700,
              flexShrink: 0, marginTop: 8,
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <input value={s.title} onChange={e => updateSession(i, 'title', e.target.value)} placeholder="Session title" style={{ ...inputStyle, marginBottom: 4 }} />
              <input value={s.description} onChange={e => updateSession(i, 'description', e.target.value)} placeholder="Brief description" style={{ ...inputStyle, fontSize: '0.8rem' }} />
            </div>
            {sessions.length > 1 && (
              <button type="button" onClick={() => removeSession(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addSession} style={{
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: 'var(--cr-radius-sm)',
          background: 'var(--sandstone)', color: 'var(--text-muted)',
          fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600,
          textTransform: 'uppercase', cursor: 'pointer', border: 'none',
        }}>
          <Plus size={12} /> Add Session
        </button>
      </div>

      <button type="submit" style={{
        marginTop: 16, padding: '10px 24px',
        borderRadius: 'var(--cr-radius-md)',
        background: 'var(--cr8w-primary)', color: '#fff',
        fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
      }}>
        + new offering
      </button>
    </form>
  );
}
