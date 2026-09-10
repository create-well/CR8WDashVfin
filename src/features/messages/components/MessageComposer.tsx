import React from 'react';
import { useMessageContext } from '../context';
import { PERSONS } from '../../../app/data';
import { MSG_TYPES, TAG_META } from '../utils';
import { parseMsg } from '../utils';
import { MsgTag } from '../types';

export function MessageComposer() {
  const {
    inputFocused, setInputFocused, msgType, setMsgType, activeTag, toggleTag,
    replyToId, setReplyToId, activeAs, text, setText, handleSend, sending,
    inputRef, messages
  } = useMessageContext();

  const activeP = PERSONS[activeAs];
  const replyTarget = replyToId !== null ? messages.find(m => m.id === replyToId) : null;
  const dial = parseInt(localStorage.getItem('visibilityDial') || '1');

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div style={{
      flexShrink: 0, borderTop: '1px solid #2a2a2c', background: '#1c1c1e',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
    }}>
      {inputFocused && (
        <div style={{ animation: 'msgFadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', gap: 4, padding: '8px 14px 4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {MSG_TYPES.map(t => (
              <button key={t.id} onClick={() => setMsgType(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                  border: msgType === t.id ? 'none' : '1px solid #3a3a3c',
                  background: msgType === t.id ? '#7BA89D' : '#2c2c2e',
                  color: msgType === t.id ? '#fff' : '#8e8e93',
                  fontSize: '0.62rem', fontWeight: 700,
                  fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.4px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '2px 14px 4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.56rem', color: '#4a4a4e', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 2 }}>Tag:</span>
            {(['urgent', 'important', 'pinned'] as MsgTag[]).map(tag => {
              if (!tag) return null;
              const t = TAG_META[tag];
              const isActive = activeTag === tag;
              return (
                <button key={tag} onClick={() => toggleTag(tag)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 7px', borderRadius: 14, flexShrink: 0,
                    border: isActive ? `1.5px solid ${t.color}` : '1px solid #3a3a3c',
                    background: isActive ? t.bg : 'transparent',
                    color: isActive ? t.color : '#636366',
                    fontSize: '0.58rem', fontWeight: 700,
                    fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.3px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '0.68rem' }}>{t.emoji}</span> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!inputFocused && (msgType !== 'message' || activeTag) && (
        <div style={{ margin: '0 14px 4px', height: 1, background: activeTag ? `${TAG_META[activeTag]?.color || '#7BA89D'}44` : 'rgba(123,168,157,0.25)', borderRadius: 1 }} />
      )}

      {replyToId !== null && replyTarget && (
        <div style={{ margin: '0 14px 5px', background: '#28282a', borderRadius: 10, borderLeft: '2.5px solid #7BA89D', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#7BA89D', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>
              {'\u21A9'} Replying to {PERSONS[replyTarget.author]?.name || replyTarget.author}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#8e8e93', fontFamily: 'Montserrat, system-ui, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
              {parseMsg(replyTarget.content || '').body.slice(0, 50)}
            </div>
          </div>
          <button onClick={() => setReplyToId(null)} style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', flexShrink: 0 }}>{'\u00D7'}</button>
        </div>
      )}

      {dial === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 14px', margin: '0 14px 2px',
          background: 'rgba(139,181,196,0.1)',
          borderRadius: 8,
          fontFamily: 'Montserrat, system-ui, sans-serif',
          fontSize: '0.58rem', fontWeight: 600,
          color: '#8BB5C4', letterSpacing: '0.02em',
        }}>
          {'\uD83E\uDEE7'} quiet mode — messages will post as "a co-creator"
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '5px 14px 8px' }}>
        <input
          id="chat-input"
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 200)}
          placeholder={
            replyToId !== null
              ? `Reply to ${PERSONS[replyTarget?.author || '']?.name || 'thread'}\u2026`
              : activeTag
                ? `${TAG_META[activeTag]?.emoji} ${TAG_META[activeTag]?.label} message as ${activeP?.name}\u2026`
                : msgType !== 'message'
                  ? `${MSG_TYPES.find(t => t.id === msgType)?.icon} ${MSG_TYPES.find(t => t.id === msgType)?.label} as ${activeP?.name}\u2026`
                  : `Message as ${activeP?.name}\u2026`
          }
          style={{
            flex: 1, background: '#2c2c2e',
            border: `1.5px solid ${activeTag ? `${TAG_META[activeTag]?.color}66` : msgType !== 'message' ? '#7BA89D66' : '#3a3a3c'}`,
            borderRadius: 22, padding: '10px 16px', color: '#fff',
            fontSize: '0.88rem', fontFamily: 'Montserrat, system-ui, sans-serif',
            outline: 'none', lineHeight: 1.4, transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: text.trim() ? (activeTag ? TAG_META[activeTag]?.color || '#0A84FF' : msgType === 'message' ? '#0A84FF' : '#7BA89D') : '#2c2c2e',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ color: '#fff', fontSize: '1rem' }}>{'\u2191'}</span>
        </button>
      </div>
    </div>
  );
}
