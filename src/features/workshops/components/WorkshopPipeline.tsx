import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Workshop } from '@/app/components/api';
import { PIPELINE_COLUMNS } from '../constants';
import { WorkshopCard } from './WorkshopCard';
import { AddWorkshopModal } from './AddWorkshopModal';

interface WorkshopPipelineProps {
  workshops: Workshop[];
  onUpdateWorkshop: (id: number, u: Partial<Workshop>) => void;
  onDeleteWorkshop: (id: number) => void;
  showAddForm: boolean;
  onToggleAdd: () => void;
  onAddWorkshop: (w: Omit<Workshop, 'id' | 'created_at'>) => void;
}

export function WorkshopPipeline({ workshops, onUpdateWorkshop, onDeleteWorkshop, showAddForm, onToggleAdd, onAddWorkshop }: WorkshopPipelineProps) {
  const [dragId, setDragId] = useState<number | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-label)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', margin: 0 }}>
          The Flow
        </h2>
        <button
          onClick={onToggleAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--cr-radius-md)',
            background: 'var(--cr8w-primary)', color: '#fff',
            fontFamily: 'var(--font-label)', fontSize: '0.8rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', border: 'none',
          }}
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : '+ new workshop'}
        </button>
      </div>

      {showAddForm && <AddWorkshopModal onSubmit={onAddWorkshop} />}

      {/* Kanban columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {PIPELINE_COLUMNS.map(col => {
          const colWorkshops = workshops.filter(w => w.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(var(--cr8w-primary-rgb, 123,168,157),0.06)'; }}
              onDragLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.background = 'transparent';
                if (dragId !== null) {
                  onUpdateWorkshop(dragId, { status: col.key });
                  setDragId(null);
                }
              }}
              style={{
                background: 'transparent',
                borderRadius: 'var(--cr-radius-md)',
                padding: 12,
                border: `1.5px dashed ${col.color}44`,
                minHeight: 200,
                transition: 'background 0.2s',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                paddingBottom: 8, borderBottom: `2px solid ${col.color}`,
              }}>
                <span>{col.emoji}</span>
                <span style={{
                  fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '1px', color: col.color,
                }}>
                  {col.label}
                </span>
                <span style={{
                  marginLeft: 'auto', background: `${col.color}22`, color: col.color,
                  borderRadius: 12, padding: '2px 8px',
                  fontFamily: 'var(--font-label)', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {colWorkshops.length}
                </span>
              </div>

              {/* Cards */}
              {colWorkshops.map(w => (
                <WorkshopCard
                  key={w.id}
                  workshop={w}
                  onDragStart={() => setDragId(w.id)}
                  onDelete={() => onDeleteWorkshop(w.id)}
                />
              ))}

              {colWorkshops.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '24px 12px',
                  color: 'var(--text-muted)', fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)', opacity: 0.6,
                }}>
                  plant something here
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
