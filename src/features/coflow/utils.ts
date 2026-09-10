import React from 'react';
import type { CoFlowDate } from '@/app/components/api';

export const LOCATION_SUGGESTIONS = [
  'Taverna Costera',
  "Sunshine's Place",
  "Monny's Studio",
  'Coffee + Commune',
  'The Park (outdoor)',
  'Virtual / Zoom',
];

export const TIME_OPTIONS = [
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
];

export const MOOD_OPTIONS: { key: string; emoji: string; label: string; color: string }[] = [
  { key: 'fire', emoji: '🔥', label: 'Energized', color: '#E85D3A' },
  { key: 'sun', emoji: '☀️', label: 'Good', color: '#D4A771' },
  { key: 'cloud', emoji: '☁️', label: 'Meh', color: '#8A9BB0' },
  { key: 'rain', emoji: '🌧️', label: 'Low', color: '#6888A5' },
  { key: 'storm', emoji: '⛈️', label: 'Rough', color: '#7A5C6B' },
];

export const PERSON_KEYS = ['sunshine', 'monny', 'bingle'] as const;

export function getNextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function formatD8(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatD8Short(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getDayOfWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getCountdown(dateStr: string): { label: string; urgent: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: 'TODAY!', urgent: true };
  if (diffDays === 1) return { label: 'TOMORROW', urgent: true };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} days ago`, urgent: false };
  return { label: `${diffDays} days away`, urgent: diffDays <= 3 };
}

export function isUpcoming(dateStr: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') >= today;
}

export function getTimeDisplay(d8: CoFlowDate): string {
  if (d8.startTime && d8.endTime) return `${d8.startTime} \u2013 ${d8.endTime}`;
  return d8.timeRange || 'TBD';
}

// ── Shared styles ─────────────────────────────────────────────────────────────
export const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
  padding: 20, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)',
};
export const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-label)', fontSize: '0.68rem', textTransform: 'uppercase',
  letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block',
};
export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--cr-radius-sm)',
  border: '1.5px solid var(--border-soft)', background: 'var(--bg-elevated)',
  fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-primary)',
};
export const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 'var(--cr-radius-md)',
  background: 'var(--cr8w-primary)', color: '#fff',
  fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
};
export const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 'var(--cr-radius-md)',
  background: 'var(--sandstone)', color: 'var(--text-secondary)',
  fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.3px', cursor: 'pointer',
  border: '1px solid var(--border-soft)',
};
