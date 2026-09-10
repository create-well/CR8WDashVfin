import React from 'react';
import type { GeyserTab } from '../types';

interface GeyserTabsProps {
  activeTab: GeyserTab;
  setActiveTab: (tab: GeyserTab) => void;
}

export function GeyserTabs({ activeTab, setActiveTab }: GeyserTabsProps) {
  const tabs: { key: GeyserTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'journey', label: 'Journey', icon: '🗺️' },
    { key: 'stations', label: 'Stations', icon: '🏕️' },
    { key: 'tasks', label: 'Moves', icon: '✅' },
    { key: 'forum', label: 'Forum', icon: '💬' },
  ];

  return (
    <div className="geyser-tabs">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`geyser-tab${activeTab === t.key ? ' active' : ''}`}
          onClick={() => setActiveTab(t.key)}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}
