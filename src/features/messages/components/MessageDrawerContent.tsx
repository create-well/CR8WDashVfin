import React from 'react';
import { useMessageContext } from '../context';
import cwLogoImg from 'figma:asset/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';

export function MessageDrawerContent() {
  const { open, setOpen, unreadCount, focusMode, setFocusMode } = useMessageContext();
  const drawerBg = '#1c1c1e';

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            right: 20,
            zIndex: 1000,
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7BA89D 0%, #6A9A8F 100%)',
            border: '2.5px solid rgba(255,255,255,0.25)',
            boxShadow: '0 4px 20px rgba(123,168,157,0.4), 0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(123,168,157,0.5), 0 3px 12px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(123,168,157,0.4), 0 2px 8px rgba(0,0,0,0.12)'; }}
          title="Open CR8W Chat"
        >
          <img src={cwLogoImg} alt="CR8W" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 20, height: 20, borderRadius: 10,
              background: '#E8C875', color: '#2C1810',
              fontSize: '0.6rem', fontWeight: 800,
              fontFamily: 'var(--font-label)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px',
              border: '2px solid #fff',
              boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
              animation: 'cwBubblePulse 2.5s ease-in-out infinite',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      <div style={{
        position: 'fixed', bottom: 0, right: 0, zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
        height: open ? 'min(82vh, 740px)' : '0px',
        width: open ? 'min(100vw, 420px)' : '0px',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        background: drawerBg,
        borderRadius: '22px 0 0 0',
        boxShadow: open ? '0 -4px 40px rgba(0,0,0,0.5), -4px 0 20px rgba(0,0,0,0.15)' : 'none',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setOpen(false)}
          style={{
            height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 16px', cursor: 'pointer',
            userSelect: 'none', borderBottom: '1px solid #2a2a2c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={cwLogoImg} alt="CW" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>CR8W Chat</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#7BA89D', color: '#fff', borderRadius: 10,
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                fontFamily: 'var(--font-label)',
              }}>
                {unreadCount} new
              </span>
            )}
            {focusMode && (
              <span style={{ background: '#FF9F0A22', color: '#FF9F0A', border: '1px solid #FF9F0A55', borderRadius: 10, fontSize: '0.58rem', fontWeight: 700, padding: '2px 7px', fontFamily: 'var(--font-label)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {'\u{1F3AF}'} Focus
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.65rem', color: '#636366', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Close</span>
            <span style={{ fontSize: '1.1rem', color: '#636366', lineHeight: 1 }}>{'\u2715'}</span>
          </div>
        </div>

        <MessageList />
        <MessageComposer />

        <style>{`
          @keyframes msgFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cwUnreadPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes cwBubblePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      </div>
    </>
  );
}
