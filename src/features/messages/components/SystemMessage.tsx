import React from 'react';
import { AnyMsg } from '../types';
import { useMessageContext } from '../context';
import { parseMsg, formatMsgTime, navLinkStyle } from '../utils';

export function SystemMessage({ msg }: { msg: AnyMsg }) {
  const {
    readIds, tappedIds, dismissedIds, activeAs,
    dismissMsg, handleNavClick, getNavTarget, observeMsg
  } = useMessageContext();

  const { prefix, body } = parseMsg(msg.content || '');
  const nav = getNavTarget(msg.content || '');
  const isUnread = !readIds.has(msg.id) && msg.author !== activeAs;
  const isTapped = tappedIds.has(msg.id);
  const isDismissed = dismissedIds.has(msg.id);

  return (
    <div
      data-msg-id={msg.id}
      ref={isUnread ? observeMsg : undefined}
      style={{
        margin: '6px 0',
        animation: 'msgFadeIn 0.35s ease',
        opacity: isDismissed ? 0.4 : isTapped ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: isUnread ? 'rgba(169,214,248,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isUnread ? 'rgba(169,214,248,0.18)' : 'rgba(255,255,255,0.04)'}`,
        borderLeft: '3px dashed rgba(184,184,184,0.5)',
        borderRadius: 14, padding: '10px 14px',
        transition: 'all 0.3s',
        position: 'relative',
      }}>
        <span style={{ fontSize: '0.78rem', flexShrink: 0, opacity: 0.7 }}>
          {prefix === 'FORUM' ? '\u{1F517}' : prefix === 'REMINDER' ? '\u{1F550}' : '\u{1F4E1}'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontSize: isUnread ? '0.78rem' : '0.74rem',
            color: isUnread ? '#c8d8e8' : '#8e8e93',
            lineHeight: 1.5,
            fontWeight: isUnread ? 500 : 400,
          }}>{body}</div>
          <div style={{
            fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: '#4a4a4e',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 5,
            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          }}>
            {formatMsgTime(msg.created_at)} {'\u00B7'} {prefix === 'FORUM' ? 'Well Sync' : prefix === 'REMINDER' ? 'Reminder' : 'System'}
            {nav.action && (
              <>
                {' '}{'\u00B7'}{' '}
                <button
                  onClick={(e) => { e.stopPropagation(); handleNavClick(msg.id, nav.action); }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  style={navLinkStyle}
                >
                  {isTapped ? '\u2705 Visited' : nav.label}
                </button>
              </>
            )}
          </div>
        </div>
        {!isDismissed && (
          <button
            onClick={(e) => { e.stopPropagation(); dismissMsg(msg.id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4a4a4e', fontSize: '0.75rem', padding: '2px 4px',
              flexShrink: 0, opacity: 0.6, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
            title="Dismiss"
          >{'\u00D7'}</button>
        )}
      </div>
    </div>
  );
}
