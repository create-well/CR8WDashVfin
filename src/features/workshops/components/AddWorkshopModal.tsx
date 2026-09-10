import React, { useState } from 'react';
import type { Workshop } from '@/app/components/api';
import { PIPELINE_COLUMNS } from '../constants';

interface AddWorkshopModalProps {
  onSubmit: (w: Omit<Workshop, 'id' | 'created_at'>) => void;
}

export function AddWorkshopModal({ onSubmit }: AddWorkshopModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [facilitator, setFacilitator] = useState<'monny' | 'sunshine' | 'bingle'>('monny');
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [googleDocLink, setGoogleDocLink] = useState('');
  const [status, setStatus] = useState<Workshop['status']>('ideation');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      facilitator,
      date,
      capacity: parseInt(capacity) || 20,
      participants: 0,
      location: location.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      googleDocLink: googleDocLink.trim() || undefined,
      status,
    });
    setTitle(''); setDescription(''); setDate(''); setCapacity('20'); setLocation(''); setTags(''); setGoogleDocLink('');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    borderRadius: 'var(--cr-radius-sm)',
    border: '1.5px solid var(--border-soft)',
    background: 'var(--bg-elevated)',
    fontFamily: 'var(--font-body)', fontSize: '0.85rem',
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
      border: '1px solid var(--border-soft)',
      animation: 'cw-fadeInUp 0.3s ease',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Workshop title..." style={inputStyle} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this workshop about..." style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Facilitator</label>
          <select value={facilitator} onChange={e => setFacilitator(e.target.value as any)} style={inputStyle}>
            <option value="monny">Monny</option>
            <option value="sunshine">Sunshine</option>
            <option value="bingle">Bingle</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as Workshop['status'])} style={inputStyle}>
            {PIPELINE_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Capacity</label>
          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} style={inputStyle} min="1" />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Taverna Costera" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="somatic, breathwork" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Google Doc Link</label>
          <input value={googleDocLink} onChange={e => setGoogleDocLink(e.target.value)} placeholder="https://docs.google.com/..." style={inputStyle} />
        </div>
      </div>
      <button type="submit" style={{
        marginTop: 16, padding: '10px 24px',
        borderRadius: 'var(--cr-radius-md)',
        background: 'var(--cr8w-primary)', color: '#fff',
        fontFamily: 'var(--font-label)', fontSize: '0.82rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
      }}>
        + new workshop
      </button>
    </form>
  );
}
