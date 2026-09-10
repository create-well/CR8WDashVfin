import React from 'react';
import { WORKSPACE_TOOLS } from '../utils';

interface ToolsSectionProps {
  onNavigateGeyserStations: () => void;
  gcalConnected?: boolean;
}

export function ToolsSection({ onNavigateGeyserStations, gcalConnected }: ToolsSectionProps) {
  return (
    <div className="hub-section-sm">
      <div className="hub-section-header">
        <span className="hub-section-title">Tools</span>
      </div>

      <div className="hub-tools-grid hub-tools-grid-2">
        <a
          href="https://docs.google.com/spreadsheets/d/1yTemDgbFQG3SdkD8uy-0v1Ogc0XIyS2sWj-iR-xLToc/edit"
          target="_blank" rel="noopener noreferrer"
          className="hub-tool-tile hub-tool-tile-internal"
        >
          <div className="hub-tool-tile-logo" style={{ fontSize: '1.6rem', lineHeight: 1 }}>📋</div>
          <span className="hub-tool-tile-label">Invite List</span>
        </a>
        <button
          className="hub-tool-tile hub-tool-tile-internal"
          onClick={() => onNavigateGeyserStations()}
        >
          <div className="hub-tool-tile-logo" style={{ fontSize: '1.6rem', lineHeight: 1 }}>📍</div>
          <span className="hub-tool-tile-label">Stations</span>
        </button>
      </div>

      <div className="hub-tools-grid hub-tools-grid-3">
        {WORKSPACE_TOOLS.map(({ id, label, Logo, href }) => (
          <a
            key={id}
            href={href}
            target="_blank" rel="noopener noreferrer"
            className={`hub-tool-tile${id === 'gcal' ? ' hub-tool-tile-gcal' : ''}`}
            style={{ position: 'relative' }}
          >
            {id === 'gcal' && gcalConnected && (
              <span className="hub-gcal-connected-badge">Connected</span>
            )}
            <div className="hub-tool-tile-logo"><Logo size={28} /></div>
            <span className="hub-tool-tile-label">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
