/**
 * Content actions — extracted from DashboardContext.
 * Manages brain dumps, announcements, and well notes with optimistic updates.
 */
import * as api from '../app/components/api';
import type { BrainDump, Announcement, WellNote } from '../app/components/api';

export interface ContentActions {
  addBrainDump: (dump: Omit<BrainDump, 'id' | 'created_at'>) => Promise<void>;
  deleteBrainDump: (id: number) => Promise<void>;
  dismissAnnouncement: (id: number) => Promise<void>;
  addAnnouncement: () => Promise<void>;
  addWellNote: (content: string) => Promise<void>;
  landWellNote: (id: number) => Promise<void>;
}

export function createContentActions(
  setBrainDumps: React.Dispatch<React.SetStateAction<BrainDump[]>>,
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>,
  setWellNotes: React.Dispatch<React.SetStateAction<WellNote[]>>,
  getWellNotes: () => WellNote[],
  sendSystemMessage: (content: string) => void,
): ContentActions {
  return {
    async addBrainDump(dump) {
      try {
        const created = await api.createBrainDump(dump);
        setBrainDumps(prev => [created, ...prev]);
      } catch (e) { console.error('Add brain dump error:', e); }
    },

    async deleteBrainDump(id) {
      try {
        setBrainDumps(prev => prev.filter(d => d.id !== id));
        await api.deleteBrainDump(id);
      } catch (e) { console.error('Delete brain dump error:', e); }
    },

    async dismissAnnouncement(id) {
      try {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        await api.deleteAnnouncement(id);
      } catch (e) { console.error('Dismiss announcement error:', e); }
    },

    async addAnnouncement() {
      const text = prompt('New announcement:');
      if (!text) return;
      const priority = (prompt('Priority (high, medium, low):') || 'high') as Announcement['priority'];
      try {
        const created = await api.createAnnouncement({ text, priority, active: 1 });
        setAnnouncements(prev => [created, ...prev]);
      } catch (e) { console.error('Add announcement error:', e); }
    },

    async addWellNote(content) {
      try {
        const created = await api.createWellNote({ content });
        setWellNotes(prev => [...prev, created]);
        sendSystemMessage('💧 someone dropped a note in the well — pull from the spring to find it');
      } catch (e) { console.error('Add well note error:', e); }
    },

    async landWellNote(id) {
      try {
        const note = getWellNotes().find(n => n.id === id);
        if (!note) return;
        const updated = await api.updateWellNote(id, { landed: (note.landed || 0) + 1 });
        setWellNotes(prev => prev.map(n => n.id === id ? updated : n));
      } catch (e) { console.error('Land well note error:', e); }
    },
  };
}
