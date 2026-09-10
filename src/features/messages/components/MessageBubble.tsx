import React from 'react';
import { AnyMsg } from '../types';
import { useMessageContext } from '../context';
import { SENDER_COLORS, parseMsg, formatMsgTime, isFocusMsg, isSystemMsg, menuBtnStyle, TAG_META, REACTION_EMOJIS } from '../utils';
import { PERSONS } from '../../../app/data';
import { MessageReactions, TagBadge, HoverBar } from './MessageReactions';

export function MessageBubble({ msg, idx, groupMsgs }: { msg: AnyMsg; idx: number; groupMsgs: AnyMsg[] }) {
  const {
    activeAs, readIds, focusMode, msgMenu, setMsgMenu, editingId,
    setReplyToId, setReactionPicker, reactionPicker, toggleMsgTag, startEdit, confirmDelete,
    editText, setEditText, commitEdit, cancelEdit, deleteConfirmId, executeDelete, setDeleteConfirmId,
    chatReplies, openReplies, setOpenReplies, localReactions, toggleReaction,
    handleMsgPointerEnter, handleMsgPointerLeave, handleMsgTouchStart, handleMsgTouchEnd,
    editInputRef, observeMsg
  } = useMessageContext();

  const isMine   = msg.author === activeAs;
  const p        = PERSONS[msg.author];
  const pColor   = p?.color || '#A89888';
  const senderColor = SENDER_COLORS[msg.author] || pColor;
  const prev     = idx > 0 ? groupMsgs[idx - 1] : null;
  const next     = idx < groupMsgs.length - 1 ? groupMsgs[idx + 1] : null;
  const showHead = !prev || prev.author !== msg.author || isSystemMsg(prev);
  const showTail = !next || next.author !== msg.author || isSystemMsg(next);
  const isMenu   = msgMenu === msg.id;
  const replies  = chatReplies[msg.id] || [];
  const { prefix, body } = parseMsg(msg.content || '');
  const isEditing = editingId === msg.id;
  const isDelConfirm = deleteConfirmId === msg.id;
  const isEdited = (msg as any).edited;
  const msgTag   = (msg as any).tag;
  const isUnread = !readIds.has(msg.id) && !isMine;

  const msgOpacity = focusMode && !isFocusMsg(msg) ? 0 : 1;
  const msgDisplay = focusMode && !isFocusMsg(msg) ? 'none' : undefined;
  const bubbleBg = 'rgba(123,168,157,0.12)';
  const tagBorder = msgTag && TAG_META[msgTag] ? `2px solid ${TAG_META[msgTag].color}44` : undefined;

  const TYPE_BADGE: Record<string, { icon: string; label: string; color: string }> = {
    UPDATE:   { icon: '\u{1F4CC}', label: 'Update',   color: '#E8A090' },
    REMINDER: { icon: '\u{1F550}', label: 'Reminder', color: '#FF9F0A' },
    IDEA:     { icon: '\u{1F4A1}', label: 'Idea',      color: '#FFD60A' },
  };
  const badge = prefix && TYPE_BADGE[prefix] ? TYPE_BADGE[prefix] : null;

  if (prefix === 'FORUM') {
    return (
      <div key={msg.id} ref={isUnread ? observeMsg : undefined} data-msg-id={msg.id}
        style={{ margin: '5px 0 12px', display: msgDisplay || 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end', animation: 'msgFadeIn 0.35s ease', opacity: msgOpacity }}
        onMouseEnter={() => handleMsgPointerEnter(msg.id)}
        onMouseLeave={handleMsgPointerLeave}
        onTouchStart={() => handleMsgTouchStart(msg.id)}
        onTouchEnd={handleMsgTouchEnd}
      >
        {!isMine && (
          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `${pColor}33`, border: `1.5px solid ${pColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem' }}>
            {p?.emoji || '\u{1F464}'}
          </div>
        )}
        <div style={{ maxWidth: '76%', position: 'relative' }}>
          <div style={{ background: 'rgba(123,168,157,0.12)', border: '1px solid #3a3a3c', borderLeft: `3px solid ${senderColor}`, borderRadius: 14, padding: '10px 14px', position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: pColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
              {'\u{1F517}'} Well Drop {'\u00B7'} {p?.name}<TagBadge msg={msg} />
            </div>
            <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '0.86rem', color: '#e5e5ea', lineHeight: 1.45 }}>{body}</div>
            <HoverBar msg={msg} isMine={isMine} />
          </div>
          <div style={{ fontSize: '0.62rem', color: '#4a4a4e', marginTop: 4, paddingLeft: 4 }}>{formatMsgTime(msg.created_at)}</div>
          <MessageReactions msg={msg} />
        </div>
      </div>
    );
  }

  return (
    <div key={msg.id} ref={isUnread ? observeMsg : undefined} data-msg-id={msg.id}
      style={{ marginBottom: showTail ? 12 : 4, opacity: msgOpacity, display: msgDisplay, transition: 'opacity 0.2s', animation: 'msgFadeIn 0.35s ease' }}>
      {prefix && showHead && badge && (
        <div style={{ textAlign: isMine ? 'right' : 'left', padding: '6px 38px 3px', opacity: 0.5 }}>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.56rem', color: badge.color || '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {badge.icon} {badge.label}
          </span>
        </div>
      )}

      <div
        style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, position: 'relative', cursor: 'pointer' }}
        onClick={() => { if (!isEditing) setMsgMenu(isMenu ? null : msg.id); }}
        onMouseEnter={() => handleMsgPointerEnter(msg.id)}
        onMouseLeave={handleMsgPointerLeave}
        onTouchStart={() => handleMsgTouchStart(msg.id)}
        onTouchEnd={handleMsgTouchEnd}
      >
        {!isMine && (
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: `${pColor}33`, border: `1.5px solid ${pColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem',
            visibility: showHead || showTail ? 'visible' : 'hidden',
          }}>{p?.emoji || '\u{1F464}'}</div>
        )}

        <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
          {!isMine && showHead && (
            <span style={{ fontSize: '0.68rem', color: pColor, fontWeight: 600, marginBottom: 3, paddingLeft: 4, fontFamily: 'var(--font-label)', display: 'inline-flex', alignItems: 'center' }}>
              {p?.name}<TagBadge msg={msg} />
            </span>
          )}
          {isMine && showHead && msgTag && (
            <span style={{ marginBottom: 3, paddingRight: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <TagBadge msg={msg} />
            </span>
          )}

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 180, maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
              <input ref={editInputRef} value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                style={{
                  background: '#3a3a3c', border: '1.5px solid #7BA89D',
                  borderRadius: 16, padding: '9px 14px', color: '#fff',
                  fontSize: '0.88rem', fontFamily: 'Montserrat, system-ui, sans-serif', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 5, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <button onClick={commitEdit} style={{ background: '#7BA89D', border: 'none', color: '#fff', borderRadius: 10, padding: '5px 14px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-label)', fontWeight: 700 }}>Save</button>
                <button onClick={cancelEdit} style={{ background: '#3a3a3c', border: 'none', color: '#8e8e93', borderRadius: 10, padding: '5px 14px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-label)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
              <div style={{
                background: bubbleBg, color: '#fff',
                padding: '10px 14px',
                borderRadius: isMine ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                fontSize: '0.88rem', lineHeight: 1.5, wordBreak: 'break-word',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                position: 'relative',
                borderLeft: `3px solid ${senderColor}`,
                borderTop: tagBorder || '1px solid rgba(255,255,255,0.04)',
                borderRight: tagBorder || '1px solid rgba(255,255,255,0.04)',
                borderBottom: tagBorder || '1px solid rgba(255,255,255,0.04)',
                boxShadow: isUnread ? `0 0 0 1px ${senderColor}44` : undefined,
              }}>
                {body}
                <HoverBar msg={msg} isMine={isMine} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 1, flexShrink: 0, paddingBottom: 2 }}>
                <span style={{ fontSize: '0.62rem', color: '#4a4a4e' }}>{formatMsgTime(msg.created_at)}</span>
                {isEdited && <span style={{ fontSize: '0.55rem', color: '#4a4a4e', fontStyle: 'italic', fontFamily: 'var(--font-label)' }}>(edited)</span>}
              </div>
            </div>
          )}

          {!isEditing && <MessageReactions msg={msg} />}
        </div>
      </div>

      {isMenu && !isEditing && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '5px 38px 3px', gap: 5 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReplyToId(msg.id); setMsgMenu(null); setTimeout(() => { const input = document.getElementById('chat-input'); if(input) input.focus(); }, 100); }}
            style={menuBtnStyle('#ebebf5')}>{'\u21A9'} Reply</button>
          <button onClick={() => setReactionPicker(reactionPicker === msg.id ? null : msg.id)}
            style={menuBtnStyle('#ebebf5')}>{'\u{1F600}'} React</button>
          {!(msg as any).isSync && (
            <>
              <button onClick={() => toggleMsgTag(msg.id, 'urgent')} style={menuBtnStyle(msgTag === 'urgent' ? '#FF453A' : '#8e8e93')}>
                {'\u{1F525}'}{msgTag === 'urgent' ? ' \u2713' : ''}
              </button>
              <button onClick={() => toggleMsgTag(msg.id, 'important')} style={menuBtnStyle(msgTag === 'important' ? '#FFD60A' : '#8e8e93')}>
                {'\u2B50'}{msgTag === 'important' ? ' \u2713' : ''}
              </button>
              <button onClick={() => toggleMsgTag(msg.id, 'pinned')} style={menuBtnStyle(msgTag === 'pinned' ? '#30D158' : '#8e8e93')}>
                {'\u{1F4CC}'}{msgTag === 'pinned' ? ' \u2713' : ''}
              </button>
            </>
          )}
          {isMine && (
            <>
              <button onClick={() => startEdit(msg)} style={menuBtnStyle('#A9D6F8')}>{'\u270E'} Edit</button>
              <button onClick={() => confirmDelete(msg.id)} style={menuBtnStyle('#ff453a')}>{'\u2715'} Delete</button>
            </>
          )}
        </div>
      )}

      {isDelConfirm && (
        <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '5px 38px 3px', gap: 6, alignItems: 'center' }}
          onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: '0.7rem', color: '#ff453a', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delete?</span>
          <button onClick={executeDelete} style={{ background: '#ff453a', border: 'none', color: '#fff', borderRadius: 10, padding: '4px 14px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-label)', fontWeight: 700 }}>Yes</button>
          <button onClick={() => setDeleteConfirmId(null)} style={{ background: '#3a3a3c', border: 'none', color: '#8e8e93', borderRadius: 10, padding: '4px 12px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-label)' }}>Cancel</button>
        </div>
      )}

      {reactionPicker === msg.id && (
        <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '0 38px 5px' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 22, padding: '5px 9px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            {REACTION_EMOJIS.map(r => {
              const iReacted = (localReactions[msg.id]?.[r] || []).includes(activeAs);
              return (
                <button key={r} onClick={() => toggleReaction(msg.id, r)}
                  style={{
                    background: iReacted ? 'rgba(123,168,157,0.25)' : 'none',
                    border: iReacted ? '1px solid rgba(123,168,157,0.4)' : '1px solid transparent',
                    borderRadius: 12, cursor: 'pointer', fontSize: '1.1rem', padding: '3px 6px',
                    transition: 'all 0.15s',
                  }}>{r}</button>
              );
            })}
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ paddingLeft: isMine ? 0 : 38, paddingRight: isMine ? 38 : 0, marginTop: 3 }}>
          <button onClick={e => { e.stopPropagation(); setOpenReplies(prev => { const s = new Set(prev); s.has(msg.id) ? s.delete(msg.id) : s.add(msg.id); return s; }); }}
            style={{ background: 'none', border: 'none', color: '#4a4a4e', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 0' }}>
            {openReplies.has(msg.id) ? '\u25BE' : '\u25B8'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {openReplies.has(msg.id) && (
            <div style={{ borderLeft: '2px solid #3a3a3c', paddingLeft: 10, marginLeft: 4, marginTop: 5 }}>
              {replies.map(r => {
                const rp = PERSONS[r.author];
                return (
                  <div key={r.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: rp?.color || '#8e8e93', fontFamily: 'var(--font-label)', fontWeight: 600, marginBottom: 2 }}>
                      {rp?.emoji} {rp?.name} <span style={{ color: '#4a4a4e' }}>{'\u00B7'} {r.ts}</span>
                    </div>
                    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '0.82rem', color: '#ebebf5', background: '#28282a', borderRadius: 12, padding: '7px 11px', lineHeight: 1.4, display: 'inline-block' }}>{r.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
