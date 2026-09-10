import React from 'react';
import { AnyMsg } from '../types';
import { useMessageContext } from '../context';
import { REACTION_EMOJIS, TAG_META } from '../utils';

export function MessageReactions({ msg }: { msg: AnyMsg }) {
  const { localReactions, toggleReaction, activeAs } = useMessageContext();
  const reactions = localReactions[msg.id];
  if (!reactions || Object.keys(reactions).length === 0) return null;
  
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
      {Object.entries(reactions).map(([emoji, users]) => {
        const iReacted = users.includes(activeAs);
        return (
          <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: iReacted ? 'rgba(123,168,157,0.2)' : '#2c2c2e',
              border: iReacted ? '1px solid rgba(123,168,157,0.5)' : '1px solid #3a3a3c',
              borderRadius: 14, padding: '3px 9px', cursor: 'pointer',
              fontSize: '0.72rem', color: '#ebebf5', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>{emoji}</span>
            <span style={{ fontFamily: 'var(--font-label)', fontWeight: 700, fontSize: '0.65rem' }}>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TagBadge({ msg }: { msg: AnyMsg }) {
  const tag = (msg as any).tag;
  if (!tag || !TAG_META[tag]) return null;
  const t = TAG_META[tag];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      background: t.bg, border: `1px solid ${t.color}44`,
      borderRadius: 8, padding: '1px 6px', marginLeft: 4,
      fontSize: '0.55rem', fontWeight: 700, color: t.color,
      fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{t.emoji} {t.label}</span>
  );
}

export function HoverBar({ msg, isMine }: { msg: AnyMsg; isMine: boolean }) {
  const { hoveredMsgId, toggleReaction, onAddWellNote, sendToWell } = useMessageContext();
  if (hoveredMsgId !== msg.id) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: -36,
        [isMine ? 'right' : 'left']: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#fff',
        borderRadius: 22,
        padding: '4px 6px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        animation: 'msgFadeIn 0.15s ease',
      }}
      onClick={e => e.stopPropagation()}
    >
      {REACTION_EMOJIS.map(r => (
        <button key={r} onClick={() => toggleReaction(msg.id, r)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.95rem', padding: '2px 4px', borderRadius: 8,
            transition: 'transform 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >{r}</button>
      ))}
      {onAddWellNote && (
        <>
          <span style={{ width: 1, height: 16, background: '#e0e0e0', margin: '0 2px', flexShrink: 0 }} />
          <button
            onClick={() => sendToWell(msg)}
            title="Send to the Well"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', padding: '2px 4px', borderRadius: 8,
              transition: 'transform 0.12s',
              opacity: 0.7,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.7'; }}
          >{'\u{1F4A7}'}</button>
        </>
      )}
    </div>
  );
}
