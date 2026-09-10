import React, { useState } from 'react';
import type { Task } from '../../../app/components/api';
import { TASK_ROLES, capitalize } from '../../../app/components/data';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  actionItems: Task[];
  onAddTask: () => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onUpdateTaskStatus: (id: number, status: string) => void;
  onDeleteTask: (id: number) => void;
}

export function TaskList({
  actionItems, onAddTask, onUpdateTask, onUpdateTaskStatus, onDeleteTask
}: TaskListProps) {
  const [taskFilter, setTaskFilter] = useState<string>('all');

  const filtered = taskFilter === 'all' ? actionItems : actionItems.filter(t => t.person === taskFilter);
  const sorted = [...filtered].sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const statusOrder: Record<string, number> = { blocked: 0, todo: 1, in_progress: 2, done: 3 };
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="geyser-tab-content">
      {/* Prominent terracotta Add Task CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="geyser-section-title" style={{ marginBottom: 0 }}>✅ Next Moves</h3>
        <button
          onClick={onAddTask}
          style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: '#C25B38', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 10px rgba(194,91,56,0.28)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#A84A2A'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C25B38'; }}
        >
          + Drop a Move
        </button>
      </div>

      {/* Role-aware filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTaskFilter('all')}
          style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
            border: `1.5px solid ${taskFilter === 'all' ? '#C25B38' : 'var(--border-soft)'}`,
            background: taskFilter === 'all' ? 'rgba(194,91,56,0.09)' : 'transparent',
            color: taskFilter === 'all' ? '#C25B38' : 'var(--text-muted)',
            fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600,
          }}
        >All Roles</button>
        {Object.entries(TASK_ROLES).map(([key, role]) => {
          const active = taskFilter === key;
          const openCount = actionItems.filter(t => t.person === key && t.status !== 'done').length;
          return (
            <button
              key={key}
              onClick={() => setTaskFilter(key)}
              title={`${role.short} — ${role.sub}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '7px 13px', borderRadius: 10, cursor: 'pointer', minWidth: 90,
                border: `1.5px solid ${active ? role.color : 'var(--border-soft)'}`,
                background: active ? `${role.color}20` : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.8rem' }}>{role.emoji}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.74rem', fontWeight: 700, color: active ? role.color : 'var(--text-primary)' }}>
                  {role.name}
                </span>
                {openCount > 0 && (
                  <span style={{ padding: '0 5px', borderRadius: 8, lineHeight: '16px', fontSize: '0.58rem', fontWeight: 700, background: active ? role.color : 'var(--sandstone)', color: active ? '#fff' : 'var(--text-muted)' }}>
                    {openCount}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.57rem', color: 'var(--text-muted)', marginTop: 1 }}>{role.short}</span>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>✨</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {taskFilter === 'all' ? 'the stage is set — what\u2019s your first move?' : `no moves for ${TASK_ROLES[taskFilter]?.name || capitalize(taskFilter)}`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
              onUpdateTaskStatus={onUpdateTaskStatus}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
