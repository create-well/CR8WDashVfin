import React from 'react';
import type { Task } from '../../../app/components/api';
import { TASK_ROLES, formatDate } from '../../../app/components/data';
import { InlineEdit } from './InlineEdit';
import { getDueClass } from '../utils';

interface TaskCardProps {
  task: Task;
  onUpdateTask: (id: number, updates: Partial<Task>) => void;
  onUpdateTaskStatus: (id: number, status: string) => void;
  onDeleteTask: (id: number) => void;
}

export function TaskCard({
  task, onUpdateTask, onUpdateTaskStatus, onDeleteTask
}: TaskCardProps) {
  const role = TASK_ROLES[task.person];
  const dueClass = getDueClass(task.due_date, task.status);

  return (
    <div className={`card ${dueClass}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
      <div className="geyser-task-person-dot" style={{ background: role?.color || '#A89888' }} title={role ? `${role.name} — ${role.sub}` : task.person}>
        {role?.emoji || '?'}
      </div>
      <div style={{ flex: 1 }}>
        <InlineEdit
          value={task.title}
          onSave={v => onUpdateTask(task.id, { title: v })}
          style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`gcc-priority-badge ${task.priority}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{task.priority}</span>
          {task.due_date && <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', color: dueClass === 'overdue' ? '#D45050' : 'var(--text-muted)' }}>Due {formatDate(task.due_date)}</span>}
          {task.category && <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--sandstone)', padding: '1px 6px', borderRadius: 4 }}>{task.category}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select
          value={task.status}
          onChange={e => onUpdateTaskStatus(task.id, e.target.value)}
          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-label)', fontSize: '0.68rem', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
        <button onClick={() => onDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', padding: 4 }}>🗑</button>
      </div>
    </div>
  );
}
