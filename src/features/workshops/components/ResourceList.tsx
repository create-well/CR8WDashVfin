import React, { useState, useMemo } from 'react';
import { Plus, X, ExternalLink } from 'lucide-react';
import type { WorkshopResource } from '@/app/components/api';
import { RESOURCE_ICONS, RESOURCE_LABELS } from '../constants';

interface ResourceListProps {
  resources: WorkshopResource[];
  showAddForm: boolean;
  onToggleAdd: () => void;
  onAddResource: (r: Omit<WorkshopResource, 'id' | 'created_at'>) => void;
  onDeleteResource: (id: number) => void;
}

export function ResourceList({ resources, showAddForm, onToggleAdd, onAddResource, onDeleteResource }: ResourceListProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, WorkshopResource[]> = {};
    resources.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [resources]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-label)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', margin: 0 }}>
          Workshop Resources
        </h2>
        <button onClick={onToggleAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 'var(--cr-radius-md)',
          background: 'var(--cr8w-primary)', color: '#fff',
          fontFamily: 'var(--font-label)', fontSize: '0.8rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
        }}>
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Add Resource'}
        </button>
      </div>

      {showAddForm && <AddResourceForm onSubmit={onAddResource} />}

      {resources.length === 0 && !showAddForm && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
          padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          border: '1px solid var(--border-soft)',
        }}>
          No resources yet. Add Google Docs, meeting notes, templates, or recordings.
        </div>
      )}

      {/* Resource cards by type */}
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 20 }}>
          <h3 style={{
            fontFamily: 'var(--font-label)', fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.8px', color: 'var(--cr8w-primary)', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {RESOURCE_ICONS[type]} {RESOURCE_LABELS[type] || type}s
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {items.map(r => (
              <div key={r.id} style={{
                background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-sm)',
                padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-soft)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
                    color: 'var(--cr8w-primary)', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {RESOURCE_ICONS[r.type]} {r.title}
                    <ExternalLink size={11} />
                  </a>
                  <button onClick={() => onDeleteResource(r.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: 'var(--text-muted)', opacity: 0.4,
                  }}>
                    <X size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-label)' }}>
                  <span>by {r.author}</span>
                  <span>{r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddResourceForm({ onSubmit }: { onSubmit: (r: Omit<WorkshopResource, 'id' | 'created_at'>) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<WorkshopResource['type']>('google-doc');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('monny');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    onSubmit({
      title: title.trim(), type, url: url.trim(),
      lastUpdated: new Date().toISOString(), author,
    });
    setTitle(''); setUrl('');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    borderRadius: 'var(--cr-radius-sm)', border: '1.5px solid var(--border-soft)',
    background: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
    color: 'var(--text-primary)',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-label)', fontSize: '0.72rem',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 600,
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-card)', borderRadius: 'var(--cr-radius-md)',
      padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-soft)', animation: 'cw-fadeInUp 0.3s ease',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title..." style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as WorkshopResource['type'])} style={inputStyle}>
            <option value="google-doc">Google Doc</option>
            <option value="meeting-notes">Meeting Notes</option>
            <option value="template">Template</option>
            <option value="recording">Recording</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Author</label>
          <select value={author} onChange={e => setAuthor(e.target.value)} style={inputStyle}>
            <option value="monny">Monny</option>
            <option value="sunshine">Sunshine</option>
            <option value="bingle">Bingle</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>URL *</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} required />
        </div>
      </div>
      <button type="submit" style={{
        marginTop: 16, padding: '10px 24px', borderRadius: 'var(--cr-radius-md)',
        background: 'var(--cr8w-primary)', color: '#fff',
        fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
      }}>
        Add Resource
      </button>
    </form>
  );
}
