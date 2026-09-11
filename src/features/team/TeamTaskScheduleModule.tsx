import React, { useMemo, useState } from 'react';
import type { CalendarEventKV, Task } from '../../app/components/api';

export interface TeamTaskScheduleModuleProps {
  tasks: Task[];
  calendarEvents: CalendarEventKV[];
  teamMembers?: Array<{ id: string; name: string }>;
  onCreateTask?: (input: Omit<Task, 'id' | 'created_at'>) => Promise<void> | void;
  onUpdateTask?: (id: number, patch: Partial<Task>) => Promise<void> | void;
  onScheduleTask?: (task: Task, start: string) => Promise<void> | void;
  onOpenCalendar?: () => void;
}

const labels: Record<Task['status'], string> = { todo: 'To do', in_progress: 'In motion', blocked: 'Blocked', done: 'Done' };
const colors: Record<Task['priority'], string> = { high: '#C25B38', medium: '#B8833F', low: '#557C71' };
export function sortUpcomingEvents(events: CalendarEventKV[], now = Date.now()) { return events.filter(e => new Date(e.start).getTime() >= now).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()); }
export function formatScheduleDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Date not set' : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }

export function TeamTaskScheduleModule({ tasks, calendarEvents, teamMembers = [], onCreateTask, onUpdateTask, onScheduleTask, onOpenCalendar }: TeamTaskScheduleModuleProps) {
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all');
  const [assignee, setAssignee] = useState('all');
  const [draft, setDraft] = useState('');
  const [person, setPerson] = useState(teamMembers[0]?.id ?? '');
  const [notice, setNotice] = useState('');
  const visible = useMemo(() => tasks.filter(t => (filter === 'all' || t.status === filter) && (assignee === 'all' || t.person === assignee)), [tasks, filter, assignee]);
  const events = useMemo(() => sortUpcomingEvents(calendarEvents).slice(0, 5), [calendarEvents]);
  async function save(action: () => Promise<void> | void, message: string) { try { await action(); setNotice(message); } catch { setNotice('That change could not be saved. Try again.'); } }
  async function add(event: React.FormEvent) { event.preventDefault(); const title = draft.trim(); if (!title || !onCreateTask) return; await save(() => onCreateTask({ title, person: person || 'unassigned', status: 'todo', priority: 'medium' }), 'Move added.'); setDraft(''); }
  return <section aria-labelledby="team-task-title" style={{ display: 'grid', gap: 16 }}>
    <header><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '.75rem' }}>The work in front of us</p><h2 id="team-task-title" style={{ margin: '4px 0', fontFamily: 'var(--font-display)' }}>Team rhythm</h2><span>{tasks.filter(t => t.status !== 'done').length} open · {tasks.filter(t => t.status === 'blocked').length} blocked</span></header>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(260px, .7fr)', gap: 16 }}>
      <div style={{ padding: 16, background: 'var(--cr8w-card-bg)', borderRadius: 14 }}>
        <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input aria-label="New move" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add the next useful move" style={{ flex: '1 1 220px', padding: 9 }} />{teamMembers.length > 0 && <select aria-label="Assign to" value={person} onChange={e => setPerson(e.target.value)}>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}<button type="submit" disabled={!onCreateTask || !draft.trim()}>Add move</button></form>
        <div aria-label="Task filters" style={{ display: 'flex', gap: 8, margin: '14px 0' }}><select aria-label="Filter by status" value={filter} onChange={e => setFilter(e.target.value as Task['status'] | 'all')}><option value="all">All statuses</option>{Object.entries(labels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>{teamMembers.length > 0 && <select aria-label="Filter by assignee" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="all">Everyone</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</div>
        <div style={{ display: 'grid', gap: 8 }}>{visible.length === 0 ? <p>No moves match these filters.</p> : visible.map(task => <article key={task.id} style={{ display: 'grid', gridTemplateColumns: '9px 1fr auto', gap: 10, alignItems: 'center', padding: 10, background: '#fff', borderRadius: 9 }}><span aria-label={`${task.priority} priority`} style={{ width: 9, height: 9, borderRadius: '50%', background: colors[task.priority] }} /><div><strong>{task.title}</strong><div style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{task.person} · {task.due_date || 'No due date'}</div></div><select aria-label={`Status for ${task.title}`} value={task.status} disabled={!onUpdateTask} onChange={e => onUpdateTask && save(() => onUpdateTask(task.id, { status: e.target.value as Task['status'] }), 'Move updated.')}>{Object.entries(labels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></article>)}</div>
      </div>
      <aside aria-labelledby="team-schedule-title" style={{ padding: 16, background: '#2D2438', color: '#fff', borderRadius: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 id="team-schedule-title" style={{ margin: 0 }}>Coming into view</h3>{onOpenCalendar && <button type="button" onClick={onOpenCalendar}>Open calendar</button>}</div>{events.length === 0 ? <p>No upcoming calendar events.</p> : events.map(event => <div key={event.id} style={{ marginTop: 12 }}><strong>{event.title}</strong><div>{formatScheduleDate(event.start)}</div>{event.location && <div>{event.location}</div>}{onScheduleTask && <button type="button" disabled={!visible.length} onClick={() => visible[0] && save(() => onScheduleTask(visible[0], event.start), 'Move linked to the calendar.')}>Place next move here</button>}</div>)}</aside>
    </div>{notice && <p role="status">{notice}</p>}
  </section>;
}
export default TeamTaskScheduleModule;
