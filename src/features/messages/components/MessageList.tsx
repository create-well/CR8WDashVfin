import React, { useMemo } from 'react';
import { useMessageContext } from '../context';
import { AnyMsg, Message } from '../types';
import { isFocusMsg, TAG_META, parseMsg, formatMsgTime } from '../utils';
import { PERSONS } from '../../../app/data';
import { MessageGroup } from './MessageGroup';
import cwLogoImg from 'figma:asset/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';

export function MessageList() {
  const {
    messages, filterMode, focusMode, readIds, dismissedIds, activeAs,
    unreadCount, showOlderMsgs, setShowOlderMsgs, undismissAll,
    toggleMsgTag, bottomRef, scrollRef, setFilterMode, setShowFilters,
    showPersonPicker, setShowPersonPicker, onSetActiveAs, showFilters
  } = useMessageContext();

  const pinnedMsgs = useMemo(() => messages.filter(m => m.tag === 'pinned'), [messages]);
  const pinnedCount = pinnedMsgs.length;
  const urgentCount = useMemo(() => messages.filter(m => m.tag === 'urgent').length, [messages]);

  const allMsgs: AnyMsg[] = useMemo(() => {
    let base: AnyMsg[] = [...messages];
    if (filterMode === 'pinned') base = base.filter(m => (m as Message).tag === 'pinned');
    else if (filterMode === 'urgent') base = base.filter(m => (m as Message).tag === 'urgent' || (m as Message).tag === 'important');
    return base.sort((a, b) =>
      (a.created_at ? new Date(a.created_at).getTime() : 0) -
      (b.created_at ? new Date(b.created_at).getTime() : 0)
    );
  }, [messages, filterMode]);

  const { newMsgs, earlierTodayMsgs, olderMsgs, dismissedMsgs } = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const newM: AnyMsg[] = [];
    const earlierM: AnyMsg[] = [];
    const olderM: AnyMsg[] = [];
    const dismissedM: AnyMsg[] = [];

    for (const m of allMsgs) {
      if (dismissedIds.has(m.id)) { dismissedM.push(m); continue; }
      const ts = m.created_at ? new Date(m.created_at) : new Date();
      const isToday = ts >= todayStart;
      const isRead = readIds.has(m.id) || m.author === activeAs;

      if (!isRead) newM.push(m);
      else if (isToday) earlierM.push(m);
      else olderM.push(m);
    }

    return { newMsgs: newM, earlierTodayMsgs: earlierM, olderMsgs: olderM, dismissedMsgs: dismissedM };
  }, [allMsgs, readIds, dismissedIds, activeAs]);

  const focusFilteredNew = focusMode ? newMsgs.filter(m => isFocusMsg(m)) : newMsgs;
  const focusFilteredEarlier = focusMode ? earlierTodayMsgs.filter(m => isFocusMsg(m)) : earlierTodayMsgs;
  const focusFilteredOlder = focusMode ? olderMsgs.filter(m => isFocusMsg(m)) : olderMsgs;

  const hasNewItems = unreadCount > 0;
  const drawerBg = '#1c1c1e';
  const activeP = PERSONS[activeAs];

  return (
    <div ref={scrollRef} style={{
      flex: 1, overflowY: 'auto', padding: '0 14px 10px',
      display: 'flex', flexDirection: 'column',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        position: 'sticky', top: 0, background: drawerBg, zIndex: 2,
        borderBottom: '1px solid #2a2a2c', padding: '10px 0 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPersonPicker(p => !p); }}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: `${activeP?.color || '#7BA89D'}33`,
              border: `2px solid ${activeP?.color || '#7BA89D'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', cursor: 'pointer',
            }}
            title={`Chatting as ${activeP?.name} \u2014 tap to switch`}
          >
            {activeP?.emoji}
          </button>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: '#636366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {activeP?.name}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilters(f => !f); }}
            style={{
              background: showFilters || filterMode !== 'all' ? 'rgba(123,168,157,0.15)' : '#2c2c2e',
              border: filterMode !== 'all' ? '1px solid rgba(123,168,157,0.4)' : '1px solid #3a3a3c',
              borderRadius: 10, padding: '5px 10px', cursor: 'pointer',
              fontSize: '0.62rem', fontWeight: 700, color: filterMode !== 'all' ? '#7BA89D' : '#636366',
              fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.3px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {'\u2630'} {filterMode !== 'all' ? filterMode : 'Filter'}
          </button>
        </div>
        <div onClick={e => { e.stopPropagation(); setFocusMode(f => !f); }} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <span style={{ fontSize: '0.58rem', color: focusMode ? '#FF9F0A' : '#636366', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Focus</span>
          <div style={{ width: 34, height: 18, borderRadius: 9, background: focusMode ? '#FF9F0A' : '#3a3a3c', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: focusMode ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {showPersonPicker && (
        <div style={{
          display: 'flex', gap: 6, padding: '8px 0', animation: 'msgFadeIn 0.2s ease',
        }}>
          {Object.entries(PERSONS).map(([k, p]) => (
            <button key={k} onClick={() => { onSetActiveAs(k); setShowPersonPicker(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20,
              border: activeAs === k ? `1.5px solid ${p.color}` : '1.5px solid #3a3a3c',
              background: activeAs === k ? `${p.color}22` : 'transparent',
              color: activeAs === k ? p.color : '#8e8e93',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-label)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div style={{ display: 'flex', gap: 5, padding: '6px 0 8px', animation: 'msgFadeIn 0.2s ease' }}>
          {([
            { mode: 'all' as const, label: 'All', icon: '', color: '#8e8e93' },
            { mode: 'pinned' as const, label: `Pinned${pinnedCount ? ` (${pinnedCount})` : ''}`, icon: '\u{1F4CC}', color: TAG_META.pinned.color },
            { mode: 'urgent' as const, label: `Urgent${urgentCount ? ` (${urgentCount})` : ''}`, icon: '\u{1F525}', color: TAG_META.urgent.color },
          ]).map(f => (
            <button key={f.mode} onClick={() => { setFilterMode(f.mode); setShowFilters(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '4px 10px', borderRadius: 14, flexShrink: 0,
                border: filterMode === f.mode ? `1.5px solid ${f.color}` : '1px solid #3a3a3c',
                background: filterMode === f.mode ? `${f.color}18` : 'transparent',
                color: filterMode === f.mode ? f.color : '#636366',
                fontSize: '0.62rem', fontWeight: 700,
                fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.4px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {f.icon && <span style={{ fontSize: '0.72rem' }}>{f.icon}</span>} {f.label}
            </button>
          ))}
        </div>
      )}

      {hasNewItems && !focusMode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(123,168,157,0.10), rgba(184,169,212,0.07))',
          border: '1px solid rgba(123,168,157,0.22)',
          borderRadius: 16, padding: '10px 14px', margin: '8px 0',
        }}>
          <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '0.76rem', color: '#aaa', lineHeight: 1.8, display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7BA89D' }}>{'\u2600\uFE0F'} Digest</span>
            <span><span style={{ color: '#7BA89D', fontWeight: 600 }}>{unreadCount} unread</span></span>
            <span style={{ color: '#3a3a3c' }}>{'\u00B7'}</span>
            <span><span style={{ color: '#A9D6F8', fontWeight: 600 }}>{messages.filter(m => m.content?.includes('[FORUM]')).length || 0} well drops</span></span>
            {pinnedCount > 0 && (
              <><span style={{ color: '#3a3a3c' }}>{'\u00B7'}</span><span style={{ color: '#30D158', fontWeight: 600 }}>{pinnedCount} pinned</span></>
            )}
            {urgentCount > 0 && (
              <><span style={{ color: '#3a3a3c' }}>{'\u00B7'}</span><span style={{ color: '#FF453A', fontWeight: 600 }}>{urgentCount} urgent</span></>
            )}
          </div>
        </div>
      )}

      {filterMode === 'all' && !focusMode && pinnedMsgs.length > 0 && (
        <div style={{ margin: '6px 0 8px' }}>
          <div style={{ background: 'rgba(48,209,88,0.05)', border: '1px solid rgba(48,209,88,0.15)', borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#30D158' }}>{'\u{1F4CC}'} Pinned ({pinnedMsgs.length})</span>
            </div>
            {pinnedMsgs.map(pm => {
              const pp = PERSONS[pm.author];
              const { body } = parseMsg(pm.content || '');
              return (
                <div key={pm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(48,209,88,0.08)' }}>
                  <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{pp?.emoji || '\u{1F464}'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.58rem', color: pp?.color || '#8e8e93', fontWeight: 600, marginBottom: 2 }}>
                      {pp?.name} {'\u00B7'} <span style={{ color: '#4a4a4e' }}>{formatMsgTime(pm.created_at)}</span>
                    </div>
                    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '0.76rem', color: '#d0d0d4', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{body}</div>
                  </div>
                  <button onClick={() => toggleMsgTag(pm.id, 'pinned')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#30D158', padding: '2px', flexShrink: 0 }} title="Unpin">{'\u{1F4CC}'}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {focusMode && (
        <div style={{
          textAlign: 'center', padding: '10px 0', marginBottom: 6,
          background: 'rgba(255,159,10,0.06)', borderRadius: 12,
        }}>
          <div style={{ color: '#FF9F0A', fontSize: '0.72rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
            {'\u{1F3AF}'} Focus Mode
          </div>
          <div style={{ color: '#636366', fontSize: '0.62rem', fontFamily: 'var(--font-label)', marginTop: 2 }}>
            Showing only urgent, pinned, reminders & @mentions
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#636366', fontSize: '0.82rem', padding: '30px 0', fontStyle: 'italic', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
          the thread is quiet {'\u2014'} drop the first vibe {'\u{1F30A}'}
        </div>
      )}

      {messages.length > 0 && unreadCount === 0 && !focusMode && filterMode === 'all' && (
        <div style={{
          textAlign: 'center', padding: '16px 0', margin: '4px 0',
        }}>
          <div style={{ fontSize: '1.1rem', marginBottom: 3 }}>{'\u2728'}</div>
          <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: '#4a4a4e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            All caught up
          </div>
        </div>
      )}

      {focusFilteredNew.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 8px',
          }}>
            <span style={{
              fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 700,
              color: '#7BA89D', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              New ({focusFilteredNew.length})
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(212,132,90,0.2)' }} />
          </div>
          <MessageGroup msgs={focusFilteredNew} />
        </div>
      )}

      {focusFilteredEarlier.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 8px',
          }}>
            <span style={{
              fontFamily: 'var(--font-label)', fontSize: '0.62rem', fontWeight: 600,
              color: '#4a4a4e', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Earlier Today
            </span>
            <div style={{ flex: 1, height: 1, background: '#2a2a2c' }} />
          </div>
          <MessageGroup msgs={focusFilteredEarlier} />
        </div>
      )}

      {focusFilteredOlder.length > 0 && (
        <div>
          <div style={{ padding: '10px 0 6px', textAlign: 'center' }}>
            <button
              onClick={() => setShowOlderMsgs(v => !v)}
              style={{
                background: '#2c2c2e', border: '1px solid #3a3a3c', borderRadius: 14,
                padding: '5px 16px', cursor: 'pointer',
                fontSize: '0.65rem', fontWeight: 700, color: '#636366',
                fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.4px',
                transition: 'all 0.15s',
              }}
            >
              {showOlderMsgs ? 'Hide older' : `Show ${focusFilteredOlder.length} older`}
            </button>
          </div>
          {showOlderMsgs && (
            <div style={{ animation: 'msgFadeIn 0.35s ease' }}>
              <MessageGroup msgs={focusFilteredOlder} />
            </div>
          )}
        </div>
      )}

      {dismissedMsgs.length > 0 && (
        <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
          <button onClick={undismissAll} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.6rem', color: '#4a4a4e', fontFamily: 'var(--font-label)',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {dismissedMsgs.length} dismissed {'\u00B7'} Restore all
          </button>
        </div>
      )}

      {filterMode !== 'all' && allMsgs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#636366', fontSize: '0.78rem', padding: '24px 0', fontStyle: 'italic', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
          {filterMode === 'pinned' ? `no pinned messages yet ${'\u2014'} tap ${'\u{1F4CC}'} on any message` : `no urgent messages ${'\u2014'} that's a good thing ${'\u2728'}`}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
