import React from 'react';
import { FileText, StickyNote, BookOpen, Video } from 'lucide-react';
import type { Workshop } from '@/app/components/api';
import type { CoFlowProfile } from './types';

export const PIPELINE_COLUMNS: { key: Workshop['status']; label: string; color: string; emoji: string }[] = [
  { key: 'ideation', label: 'Seeds', color: '#D4A771', emoji: '🌱' },
  { key: 'planning', label: 'Tending', color: '#A9D6F8', emoji: '💧' },
  { key: 'scheduled', label: 'In Bloom', color: 'var(--cr8w-primary, #7BA89D)', emoji: '🌸' },
  { key: 'completed', label: 'Harvested', color: '#7AB87A', emoji: '🧺' },
];

export const FACILITATOR_COLORS: Record<string, string> = {
  monny: 'var(--monny)',
  sunshine: 'var(--sunshine)',
  bingle: 'var(--bingle)',
};

export const FACILITATOR_SPECIALTIES: Record<string, string[]> = {
  monny: ['Embodiment', 'Sacral Practices', 'Bridging & Integration', 'Sound & Movement'],
  sunshine: ['Ideation Workshops', 'Emotional Wave Work', 'Creative Expression', 'Vision Casting'],
  bingle: ['Distillation Sessions', 'HD Readings', 'Strategy & Systems', 'Network Facilitation'],
};

export const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'google-doc': React.createElement(FileText, { size: 16 }),
  'meeting-notes': React.createElement(StickyNote, { size: 16 }),
  'template': React.createElement(BookOpen, { size: 16 }),
  'recording': React.createElement(Video, { size: 16 }),
};

export const RESOURCE_LABELS: Record<string, string> = {
  'google-doc': 'Google Doc',
  'meeting-notes': 'Meeting Notes',
  'template': 'Template',
  'recording': 'Recording',
};

export const DEFAULT_COFLOW_PROFILES: Record<string, CoFlowProfile> = {
  monny: {
    energyType: 'Sacral — Sustained Builder',
    bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
    flowWindow: 'mid-morning → early afternoon',
    commitment: 'I commit to holding space with grounded, embodied presence — matching the rhythm of whoever needs me most that day.',
    synergies: [
      { with: 'sunshine', note: 'Sunshine sparks the idea, I build the container to hold it' },
      { with: 'bingle', note: 'Bingle maps the system, I bring it into the body' },
    ],
  },
  sunshine: {
    energyType: 'Emotional — Creative Wave Rider',
    bestDays: ['Monday', 'Wednesday', 'Friday'],
    flowWindow: 'late morning → sunset',
    commitment: 'I commit to riding the wave honestly — showing up with whatever emotion is true, and channeling it into creative fuel for the group.',
    synergies: [
      { with: 'monny', note: 'Monny grounds what I ignite — together we make ideas livable' },
      { with: 'bingle', note: 'Bingle gives my visions structure so they actually land' },
    ],
  },
  bingle: {
    energyType: 'Ego — Willpower Distiller',
    bestDays: ['Tuesday', 'Thursday', 'Saturday'],
    flowWindow: 'early morning → midday',
    commitment: 'I commit to translating instinct into clarity — distilling what we sense together into something we can see, name, and act on.',
    synergies: [
      { with: 'monny', note: 'Monny embodies what I articulate — together we close the knowing-doing gap' },
      { with: 'sunshine', note: 'Sunshine brings the emotional truth I sometimes skip — together we get the full picture' },
    ],
  },
};
