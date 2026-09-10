/**
 * Task actions — extracted from DashboardContext.
 * Manages task CRUD with optimistic updates.
 */
import * as api from '../app/components/api';
import type { Task } from '../app/components/api';

export interface TaskActions {
  addTask: (item: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: number, status: Task['status']) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

export function createTaskActions(
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  sendSystemMessage: (content: string) => void,
): TaskActions {
  return {
    async addTask(item) {
      try {
        const created = await api.createTask(item);
        setTasks(prev => [...prev, created]);
        const personLabel = item.person ? item.person.charAt(0).toUpperCase() + item.person.slice(1) : 'Someone';
        sendSystemMessage(`[UPDATE] ⛲️ New Geyser task: "${item.title}" assigned to ${personLabel} (${item.priority} priority)`);
      } catch (e) { console.error('Add task error:', e); }
    },

    async updateTask(id, updates) {
      try {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        await api.updateTask(id, updates);
      } catch (e) { console.error('Update task error:', e); }
    },

    async updateTaskStatus(id, status) {
      try {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        await api.updateTask(id, { status });
      } catch (e) { console.error('Update task status error:', e); }
    },

    async deleteTask(id) {
      try {
        setTasks(prev => prev.filter(t => t.id !== id));
        await api.deleteTask(id);
      } catch (e) { console.error('Delete task error:', e); }
    },
  };
}
