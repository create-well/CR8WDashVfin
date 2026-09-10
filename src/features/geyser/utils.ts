import type { ForumPost } from '../../app/components/api';
import type { ForumReply } from './types';

export const SEED_POSTS: ForumPost[] = [];

export const SEED_REPLIES: Record<number, ForumReply[]> = {};

export const statusLabels: Record<string, string> = { in_progress: 'In Progress', planning: 'Planning', done: 'Done' };
export const statusClasses: Record<string, string> = { in_progress: 'journey-status-active', planning: 'journey-status-planning', done: 'journey-status-done' };
export const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
  'Confirmed': { bg: '#E0F0E0', color: '#3A7A3A', dot: '#6BAF6B' },
  'Planning': { bg: '#FFF3D6', color: '#8A6A20', dot: '#D4A771' },
  'Exploring': { bg: '#EAF4FC', color: '#3A6A8A', dot: '#A9D6F8' },
  'TBD': { bg: '#F0F0F0', color: '#666', dot: '#A89888' }
};

export function getDueClass(due_date?: string, status?: string): string {
  if (!due_date || status === 'done') return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(due_date + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due-soon';
  return '';
}
