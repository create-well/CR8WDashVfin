import React, { useState, useEffect } from 'react';
import { PERSONS, type BrainDump, capitalize, formatTimestamp } from '../../../app/components/data';
import { showToast } from '../../../app/components/Toast';

interface BrainDumpSectionProps {
  brainDumps: BrainDump[];
  onAddBrainDump: (dump: Omit<BrainDump, 'id' | 'created_at'>) => void;
  onDeleteBrainDump: (id: number) => void;
  activeUser?: string;
  visibilityDial: number;
}

const DUMP_TAG_PILLS = [
  { key: 'idea',       label: 'Idea',       icon: '💡' },
  { key: 'question',   label: 'Question',   icon: '❓' },
  { key: 'urgent',     label: 'Urgent',     icon: '🔥' },
  { key: 'playground', label: 'Playground', icon: '⛺' },
  { key: 'process',    label: 'Process',    icon: '🌀' },
];

export function BrainDumpSection({ brainDumps, onAddBrainDump, onDeleteBrainDump, visibilityDial, activeUser }: BrainDumpSectionProps) {
  const [showAllDumps, setShowAllDumps] = useState(false);
  const [dumpAuthor, setDumpAuthor] = useState(activeUser || 'monny');
  const [dumpContent, setDumpContent] = useState('');
  const [dumpTags, setDumpTags] = useState('');
  const [dumpFilter, setDumpFilter] = useState('all');
  const [dumpTag, setDumpTag] = useState<string | null>(null);

  const [sentToPlayground, setSentToPlayground] = useState<Set<number>>(() => {
    try { const r = localStorage.getItem('cr8w_dump_sent_pg'); return r ? new Set(JSON.parse(r)) : new Set(); } catch { return new Set(); }
  });
  const [archivedDumps, setArchivedDumps] = useState<Set<number>>(() => {
    try { const r = localStorage.getItem('dump_archive'); return r ? new Set(JSON.parse(r)) : new Set(); } catch { return new Set(); }
  });
  const [resetTimestamps, setResetTimestamps] = useState<Record<number, string>>(() => {
    try { const r = localStorage.getItem('cr8w_dump_reset_ts'); return r ? JSON.parse(r) : {}; } catch { return {}; }
  });

  function submitBrainDump() {
    if (!dumpContent.trim()) return;
    const author = visibilityDial === 0 ? 'anonymous' : dumpAuthor;
    const tagStr = dumpTag || dumpTags.trim();
    onAddBrainDump({ author, content: dumpContent.trim(), tags: tagStr, drive_link: '' });
    setDumpContent(''); setDumpTags(''); setDumpTag(null);
    showToast('🧠 dumped.');
  }

  function sendDumpToPlayground(dump: BrainDump) {
    try {
      const raw = localStorage.getItem('cr8w_playground');
      const pgData = raw ? JSON.parse(raw) : { glossary: [], brainLumps: [], seeds: [], brandLab: [], parking: [] };
      const newLump = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: dump.content, ts: Date.now() };
      pgData.brainLumps = [newLump, ...(pgData.brainLumps || [])];
      localStorage.setItem('cr8w_playground', JSON.stringify(pgData));
      const next = new Set(sentToPlayground); next.add(dump.id);
      setSentToPlayground(next);
      localStorage.setItem('cr8w_dump_sent_pg', JSON.stringify([...next]));
      showToast('⛺ sent to Playground Brain Lumps', 'well');
    } catch {
      showToast('⚠️ couldn’t send — try again', 'alert');
    }
  }

  function archiveDump(id: number) {
    const next = new Set(archivedDumps); next.add(id);
    setArchivedDumps(next);
    localStorage.setItem('dump_archive', JSON.stringify([...next]));
    showToast('🪦 resting now.');
  }

  function resetDumpTimer(id: number) {
    const next = { ...resetTimestamps, [id]: new Date().toISOString() };
    setResetTimestamps(next);
    localStorage.setItem('cr8w_dump_reset_ts', JSON.stringify(next));
    showToast('🌱 still alive — timer reset.');
  }

  const bubblingUpItem = React.useMemo(() => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    return brainDumps.find(d => {
      if (archivedDumps.has(d.id)) return false;
      if (sentToPlayground.has(d.id)) return false;
      const tag = d.tags?.trim();
      if (tag && DUMP_TAG_PILLS.some(t => t.key === tag)) return false;
      const effectiveTime = resetTimestamps[d.id]
        ? new Date(resetTimestamps[d.id]).getTime()
        : d.created_at ? new Date(d.created_at).getTime() : Date.now();
      return effectiveTime < fiveDaysAgo;
    }) || null;
  }, [brainDumps, archivedDumps, sentToPlayground, resetTimestamps]);

  const bubblingUpDaysAgo = bubblingUpItem ? (() => {
    const ts = resetTimestamps[bubblingUpItem.id]
      ? new Date(resetTimestamps[bubblingUpItem.id]).getTime()
      : bubblingUpItem.created_at ? new Date(bubblingUpItem.created_at).getTime() : Date.now();
    return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  })() : 0;

  const filteredDumps = (dumpFilter === 'all' ? brainDumps : brainDumps.filter(d => d.author === dumpFilter)).filter(d => !archivedDumps.has(d.id));
  const visibleDumps = showAllDumps ? filteredDumps : filteredDumps.slice(0, 3);

  return (
    <div className="hub-section-sm">
      <div className="hub-section-header">
        <span className="hub-section-title">Brain Dump</span>
        {brainDumps.length > 3 && (
          <button className="hub-see-all" onClick={() => setShowAllDumps(!showAllDumps)}>
            {showAllDumps ? 'show less' : `see all ${brainDumps.length}`}
          </button>
        )}
      </div>
      <div className="hub-dump-card">
        {visibilityDial === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            background: 'rgba(139,181,196,0.1)',
            borderRadius: '10px 10px 0 0',
            borderBottom: '1px solid rgba(139,181,196,0.15)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.62rem',
            color: '#8BB5C4',
            fontWeight: 600,
            letterSpacing: '0.02em',
            animation: 'cw-fadeInUp 0.3s ease',
          }}>
            🫧 quiet mode — your dump will post anonymously
          </div>
        )}
        {visibilityDial === 2 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)',
            borderRadius: '10px 10px 0 0',
            borderBottom: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)',
            fontFamily: 'var(--font-label)',
            fontSize: '0.62rem',
            color: 'var(--cr8w-primary, #7BA89D)',
            fontWeight: 600,
            letterSpacing: '0.02em',
            animation: 'cw-fadeInUp 0.3s ease',
          }}>
            🔥 open mode — your presence is fully visible
          </div>
        )}
        <div className="hub-dump-input-row">
          <select
            className="hub-dump-select"
            value={visibilityDial === 0 ? 'anonymous' : dumpAuthor}
            onChange={e => setDumpAuthor(e.target.value)}
            disabled={visibilityDial === 0}
            style={visibilityDial === 0 ? { opacity: 0.5 } : undefined}
          >
            {visibilityDial === 0 ? (
              <option value="anonymous">🫧 Anonymous</option>
            ) : (
              <>
            <option value="sunshine">☀️ Sunshine</option>
            <option value="monny">🌊 Monny</option>
            <option value="bingle">✨ Bingle</option>
            <option value="collective">🌀 Collective</option>
              </>
            )}
          </select>
          <input
            type="text"
            className="hub-dump-input"
            placeholder="Quick thought, idea, or brain dump..."
            value={dumpContent}
            onChange={e => setDumpContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitBrainDump(); }}
          />
          <button className="hub-dump-btn" onClick={submitBrainDump}>Dump 🧠</button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '4px 12px 6px', flexWrap: 'wrap' }}>
          {DUMP_TAG_PILLS.map(t => (
            <button
              key={t.key}
              onClick={() => setDumpTag(dumpTag === t.key ? null : t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 10px', borderRadius: 14, fontSize: '0.66rem',
                fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                border: dumpTag === t.key ? '1.5px solid var(--cr8w-primary, #7BA89D)' : '1px solid var(--border-soft)',
                background: dumpTag === t.key ? 'var(--cr8w-primary, #7BA89D)' : 'transparent',
                color: dumpTag === t.key ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            ><span style={{ fontSize: '0.72rem' }}>{t.icon}</span> {t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '2px 12px 4px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '🌀 All' },
            { key: 'sunshine', label: '☀️ Sunshine' },
            { key: 'monny', label: '🌊 Monny' },
            { key: 'bingle', label: '✨ Bingle' },
            { key: 'collective', label: '🌀 Collective' },
            ...(brainDumps.some(d => d.author === 'anonymous') ? [{ key: 'anonymous', label: '🫧 Anon' }] : []),
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setDumpFilter(f.key)}
              style={{
                padding: '3px 10px', borderRadius: 14, fontSize: '0.68rem',
                fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                border: dumpFilter === f.key ? '1.5px solid var(--cr8w-primary, #7BA89D)' : '1px solid var(--border-soft)',
                background: dumpFilter === f.key ? 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)' : 'transparent',
                color: dumpFilter === f.key ? 'var(--cr8w-primary, #7BA89D)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >{f.label}</button>
          ))}
        </div>
        {bubblingUpItem && (
          <div style={{
            margin: '8px 12px', padding: '10px 14px',
            border: '1.5px dashed rgba(var(--cr8w-primary-rgb, 123,168,157),0.5)',
            borderRadius: 14, background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.04)',
            animation: 'cw-fadeInUp 0.35s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '0.72rem' }}>🫧</span>
              <span style={{
                fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cr8w-primary, #7BA89D)',
              }}>Bubbling Up</span>
              <span style={{
                fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}>dropped {bubblingUpDaysAgo} day{bubblingUpDaysAgo !== 1 ? 's' : ''} ago</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-primary)',
              lineHeight: 1.5, marginBottom: 10,
            }}>{bubblingUpItem.content}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => resetDumpTimer(bubblingUpItem.id)}
                title="Still alive — reset timer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 12, fontSize: '0.64rem',
                  fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--border-soft)', background: 'transparent',
                  color: 'var(--text-primary)', transition: 'all 0.15s',
                }}
              >🌱 still alive</button>
              <button
                onClick={() => sendDumpToPlayground(bubblingUpItem)}
                title="Send to Playground"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 12, fontSize: '0.64rem',
                  fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--border-soft)', background: 'transparent',
                  color: 'var(--text-primary)', transition: 'all 0.15s',
                }}
              >⛺ send to playground</button>
              <button
                onClick={() => archiveDump(bubblingUpItem.id)}
                title="Let it rest — archive"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 12, fontSize: '0.64rem',
                  fontFamily: 'var(--font-label)', fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--border-soft)', background: 'transparent',
                  color: 'var(--text-muted)', transition: 'all 0.15s',
                }}
              >🪦 let it rest</button>
            </div>
          </div>
        )}

        {filteredDumps.length === 0 && brainDumps.length > 0 ? (
          <div className="hub-empty-dump">No dumps from {dumpFilter} yet</div>
        ) : brainDumps.length === 0 ? (
          <div className="hub-empty-dump">No brain dumps yet — be the first to drop a thought 🧠</div>
        ) : (
          <div className="hub-dump-list">
            {visibleDumps.map(d => {
              const isAnon = d.author === 'anonymous';
              const p = PERSONS[d.author];
              const color = isAnon ? '#8BB5C4' : (p ? p.color : 'var(--cr8w-primary, #7BA89D)');
              const emoji = isAnon ? '🫧' : (p ? p.emoji : '🌀');
              const displayName = isAnon ? 'anonymous' : capitalize(d.author);
              const tagKey = d.tags?.trim();
              const tagPill = DUMP_TAG_PILLS.find(t => t.key === tagKey);
              const isSentToPg = sentToPlayground.has(d.id);
              return (
                <div key={d.id} className="hub-dump-entry" style={{
                  opacity: isSentToPg ? 0.5 : 1,
                  textDecoration: isSentToPg ? 'line-through' : 'none',
                  transition: 'opacity 0.2s',
                }}>
                  <span className="hub-dump-author" style={{ color, fontStyle: isAnon ? 'italic' : 'normal' }}>{emoji} {displayName}</span>
                  <span className="hub-dump-content">{d.content}</span>
                  {tagPill && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      padding: '1px 7px', borderRadius: 10, fontSize: '0.58rem',
                      fontFamily: 'var(--font-label)', fontWeight: 600,
                      background: 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.12)', color: 'var(--cr8w-primary, #7BA89D)',
                      border: '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.25)',
                      marginLeft: 4, textDecoration: 'none',
                    }}>{tagPill.icon} {tagPill.label}</span>
                  )}
                  <span className="hub-dump-time">{formatTimestamp(d.created_at)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {tagKey === 'playground' && !isSentToPg && (
                      <button
                        onClick={() => sendDumpToPlayground(d)}
                        title="Send to Playground Brain Lumps"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '0.78rem', padding: '2px 4px', opacity: 0.7,
                          transition: 'opacity 0.15s', textDecoration: 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                      >↗️⛺</button>
                    )}
                    <button className="hub-dump-delete" onClick={() => onDeleteBrainDump(d.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
