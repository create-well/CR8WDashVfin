import React, { useState } from 'react';
import { PERSONS } from '../../../app/components/data';
import { ArriveState, shouldShowArriveState } from '../../../app/components/ArriveState';
import { getGreeting } from '../utils';

interface GreetingSectionProps {
  activeUser?: string;
  dateLabel: string;
}

export function GreetingSection({ activeUser, dateLabel }: GreetingSectionProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [showArriveCard, setShowArriveCard] = useState(() => shouldShowArriveState());

  return (
    <>
      {showArriveCard && (
        <ArriveState onDismiss={() => setShowArriveCard(false)} />
      )}
      {!showArriveCard && !shouldShowArriveState() && (() => {
        const todayMood = localStorage.getItem('arriveState');
        const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
          flowing: { emoji: '🌊', label: 'flowing' },
          foggy: { emoji: '🌫️', label: 'foggy' },
          fired: { emoji: '🔥', label: 'fired up' },
        };
        const mood = todayMood ? MOOD_MAP[todayMood] : null;
        return (
          <div className="hub-mood-breadcrumb">
            <span>you're back 🫶</span>
            {mood && (
              <>
                <span style={{ margin: '0 2px', opacity: 0.3 }}>·</span>
                <span className="mood-emoji">{mood.emoji}</span>
                <span className="mood-label">{mood.label}</span>
                <span style={{ opacity: 0.4 }}>today</span>
              </>
            )}
          </div>
        );
      })()}

      <div className="hub-greeting-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeUser && PERSONS[activeUser] && (
            <span style={{
              width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0,
              background: `${PERSONS[activeUser].color}22`,
              border: `2px solid ${PERSONS[activeUser].color}55`,
            }}>{PERSONS[activeUser].emoji}</span>
          )}
          <span className="hub-greeting">
            {getGreeting()}{activeUser && PERSONS[activeUser] ? `, ${PERSONS[activeUser].name}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="hub-greeting-date">{dateLabel}</span>
          <button
            onClick={() => {
              try {
                const ta = document.createElement('textarea');
                ta.value = window.location.href;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              } catch (_) {}
            }}
            title="Copy dashboard link"
            style={{
              background: linkCopied ? 'rgba(48,209,88,0.12)' : 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.08)',
              border: linkCopied ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(var(--cr8w-primary-rgb, 123,168,157),0.2)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.7rem',
              fontFamily: 'var(--font-label, Montserrat, sans-serif)',
              fontWeight: 600,
              color: linkCopied ? '#30D158' : 'var(--cr8w-primary, #7BA89D)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {linkCopied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Share Link
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
