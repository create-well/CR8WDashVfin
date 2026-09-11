// Navigation model shared by the TopNav desktop links and mobile drawer, kept
// in its own module so it can be asserted on without pulling in TopNav's
// figma:asset/rendering dependencies.
export type NavItem = { path: string; label: string; emoji: string; end?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { path: '/',           label: 'This Week', emoji: '💧', end: true },
  { path: '/moves',      label: 'Moves',     emoji: '⛲️' },
  { path: '/care',       label: 'Care',      emoji: '🫧' },
  { path: '/money',      label: 'Money',     emoji: '💰' },
  { path: '/decisions',  label: 'Decisions', emoji: '⚡' },
  { path: '/system',     label: 'System',    emoji: '🔧' },
];
