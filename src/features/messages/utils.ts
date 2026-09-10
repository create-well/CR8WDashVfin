import React from 'react';
import { MsgType, ParsedPrefix, AnyMsg, Message } from './types';
import { showToast } from '../../app/Toast';

export const MSG_TYPES: { id: MsgType; label: string; icon: string }[] = [
  { id: 'message',  label: 'Message',    icon: '\u{1F4AC}' },
  { id: 'update',   label: 'Update',     icon: '\u{1F4CC}' },
  { id: 'reminder', label: 'Reminder',   icon: '\u{1F550}' },
  { id: 'idea',     label: 'Idea',       icon: '\u{1F4A1}' },
  { id: 'forum',    label: 'Well Drop',  icon: '\u{1F517}' },
];

export const TYPE_PREFIX: Record<MsgType, string> = {
  message:  '',
  update:   '[UPDATE] ',
  reminder: '[REMINDER] ',
  idea:     '[IDEA] ',
  forum:    '[FORUM] ',
};

export function parseMsg(content: string): { prefix: ParsedPrefix; body: string } {
  const m = content.match(/^\[(UPDATE|REMINDER|IDEA|FORUM)\] ([\s\S]*)/);
  if (m) return { prefix: m[1] as ParsedPrefix, body: m[2] };
  return { prefix: null, body: content };
}

export const TAG_META: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  urgent:    { emoji: '\u{1F525}', label: 'URGENT',    color: '#FF453A', bg: 'rgba(255,69,58,0.15)' },
  important: { emoji: '\u2B50',    label: 'IMPORTANT', color: '#FFD60A', bg: 'rgba(255,214,10,0.12)' },
  pinned:    { emoji: '\u{1F4CC}', label: 'PINNED',    color: '#30D158', bg: 'rgba(48,209,88,0.12)' },
};

export const REACTION_EMOJIS = ['\u{1FAF6}', '\u{1F4A7}', '\u{1F525}', '\u2728', '\u{1F300}'];

export const SENDER_COLORS: Record<string, string> = {
  sunshine: '#E8C875',
  monny:    '#7BA89D',
  bingle:   '#B8A9D4',
};

const LS_REACTIONS_KEY = 'cr8w_chat_reactions';

export function loadLocalReactions(): Record<number, Record<string, string[]>> {
  try {
    const raw = localStorage.getItem(LS_REACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveLocalReactions(data: Record<number, Record<string, string[]>>) {
  try {
    localStorage.setItem(LS_REACTIONS_KEY, JSON.stringify(data));
  } catch {
    showToast('\u26A0\uFE0F couldn\u2019t save \u2014 try again', 'alert');
  }
}

export function formatMsgTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isSystemMsg(m: AnyMsg): boolean {
  return m.author === 'system' || !!(m as any).isSync;
}

export function isFocusMsg(m: AnyMsg): boolean {
  if (isSystemMsg(m)) return false;
  const { prefix } = parseMsg(m.content || '');
  if (prefix === 'REMINDER') return true;
  if ((m.content || '').includes('@')) return true;
  if ((m as Message).tag === 'urgent' || (m as Message).tag === 'pinned') return true;
  return false;
}

export function loadIdSet(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

export function saveIdSet(key: string, set: Set<number>) {
  try {
    const arr = [...set].slice(-500);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch { }
}

export const navLinkStyle: React.CSSProperties = {
  color: '#7BA89D', cursor: 'pointer',
  fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 700,
  letterSpacing: '0.03em', background: 'none', border: 'none',
  padding: 0, textDecoration: 'none', transition: 'color 0.15s',
};

export function menuBtnStyle(color: string): React.CSSProperties {
  return {
    background: '#3a3a3c', border: 'none', color, borderRadius: 10,
    padding: '4px 11px', fontSize: '0.7rem', cursor: 'pointer',
    fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.04em',
  };
}
