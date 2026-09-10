import React from 'react';
import cwLogoImg from 'figma:asset/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';
import type { Workshop } from '../../../app/components/api';

export const WELLSHOP_TAG_MAP: Record<string, string[]> = {
  wellshop: ['wellshop', 'reflection', 'grounding', 'journaling', 'inner', 'nurture', 'decomprocess'],
  expresshop: ['expresshop', 'expression', 'sharing', 'presenting', 'pitching', 'storytelling', 'outer'],
  playshop: ['playshop', 'play', 'creative', 'show-and-tell', 'experiment', 'fun'],
};

export function matchesCategory(workshop: Workshop, categoryKey: string): boolean {
  const keywords = WELLSHOP_TAG_MAP[categoryKey] || [];
  const titleLower = workshop.title.toLowerCase();
  const descLower = workshop.description.toLowerCase();
  const tagSet = (workshop.tags || []).map(t => t.toLowerCase());
  return keywords.some(kw =>
    tagSet.includes(kw) || titleLower.includes(kw) || descLower.includes(kw)
  );
}

export function LogoCW({ size = 28 }: { size?: number }) {
  return (
    <img
      src={cwLogoImg}
      alt="CW"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

export function LogoGoogleDrive({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
      <path d="M59.8 53H87.3l-13.75-23.8L59.8 53z" fill="#2684fc"/>
      <path d="M27.5 53l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h51.8c1.6 0 3.15-.45 4.5-1.2L59.8 53H27.5z" fill="#ffba00"/>
    </svg>
  );
}

export function LogoNotion({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="18" fill="#fff"/>
      <path d="M21.4 20.9c3.3 2.7 4.5 2.5 10.7 2.1l58.1-3.5c1.2 0 .2-1.2-.4-1.4l-9.9-7.1c-1.9-1.4-4.4-3-9.3-2.6L14.5 12c-2 .2-2.4 1.2-1.6 2z" fill="#e8e3da"/>
      <path d="M24.4 31.4v55.7c0 3 1.5 4.1 4.9 3.9l63.9-3.7c3.4-.2 4.2-2.3 4.2-4.9V27.2c0-2.6-1-4-3.3-3.7l-66.4 4c-2.5.1-3.3 1.4-3.3 3.9z" fill="#fffef9"/>
      <path d="M68.8 30.6l-30.4 1.8c-1.5.1-2 1-2 2.1v38.4c0 1.2.6 1.8 1.9 1.6l32.4-1.9c1.3-.1 1.9-1 1.9-2.1V32.5c0-1.1-.5-2-3.8-1.9z" fill="#e8e3da"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M38.1 37.6c-.9.5-.9 1.7-.3 2.2l20 13.7v27.6c0 1.3 1 1.8 1.8 1.2l9.5-5.7c.8-.5 1.2-1.5 1.2-2.5V46.9L52.7 34.4c-1.2-.9-2.9-.8-4 .2l-10.6 3z" fill="#1d1c1d"/>
    </svg>
  );
}

export function LogoGmail({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
      <rect width="75" height="75" rx="14" fill="#fff"/>
      <path d="M10 22l27.5 18L65 22" stroke="#EA4335" strokeWidth="2" fill="none"/>
      <path d="M10 22v31h55V22L37.5 40z" fill="#fff" stroke="#ccc" strokeWidth="1"/>
      <path d="M10 22l27.5 18L65 22V18c0-2.2-1.8-4-4-4H14c-2.2 0-4 1.8-4 4v4z" fill="#EA4335"/>
      <path d="M10 53V22l0 0v31c0 2.2 1.8 4 4 4h5V26L10 22z" fill="#C5221F"/>
      <path d="M65 22v31c0 2.2-1.8 4-4 4h-5V26l9-4z" fill="#C5221F"/>
      <path d="M19 26v31h37V26L37.5 40z" fill="#FFFFFF"/>
    </svg>
  );
}

export function LogoGCal({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
      <rect width="75" height="75" rx="14" fill="#fff"/>
      <rect x="10" y="18" width="55" height="47" rx="4" fill="#fff" stroke="#E0E0E0" strokeWidth="1.5"/>
      <rect x="10" y="18" width="55" height="18" rx="4" fill="#1A73E8"/>
      <rect x="10" y="30" width="55" height="6" fill="#1A73E8"/>
      <text x="37.5" y="28" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="sans-serif">CAL</text>
      <line x1="10" y1="44" x2="65" y2="44" stroke="#E0E0E0" strokeWidth="1"/>
      <line x1="10" y1="54" x2="65" y2="54" stroke="#E0E0E0" strokeWidth="1"/>
      <line x1="27" y1="36" x2="27" y2="65" stroke="#E0E0E0" strokeWidth="1"/>
      <line x1="44" y1="36" x2="44" y2="65" stroke="#E0E0E0" strokeWidth="1"/>
      <rect x="36" y="46" width="8" height="7" rx="1" fill="#EA4335" opacity="0.9"/>
      <text x="13" y="52" fill="#555" fontSize="6" fontFamily="sans-serif">S</text>
      <text x="20" y="52" fill="#555" fontSize="6" fontFamily="sans-serif">M</text>
    </svg>
  );
}

export const WORKSPACE_TOOLS = [
  { id: 'gmail',    label: 'Gmail',            Logo: LogoGmail,       href: 'https://mail.google.com' },
  { id: 'gcal',     label: 'Google Calendar',  Logo: LogoGCal,        href: 'https://calendar.google.com/calendar/u/0/r' },
  { id: 'drive',    label: 'CW Drive',         Logo: LogoGoogleDrive, href: 'https://drive.google.com/drive/folders/1d9OyYZusS0yyYsfwtjLkz1ss0KYPzl5a' },
];

export const TEAM_CALENDAR_EMBED = 'https://calendar.google.com/calendar/embed?height=400&wkst=1&ctz=America%2FLos_Angeles&src=ODUyODMxYTc1MDhkYWZjMmUwYjNhYjcyOGZkYzczMWU3YmQ0NWI1NjhiNGFiOGIwZmQ3NjU3YTVlNTc3MTkzNEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23f4be40';

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
