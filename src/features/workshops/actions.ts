/**
 * Workshop actions — extracted from DashboardContext.
 * Manages workshops, programs, and resources with optimistic updates.
 */
import * as api from '../app/components/api';
import type { Workshop, WorkshopProgram, WorkshopResource } from '../app/components/api';

export interface WorkshopActions {
  addWorkshop: (w: Omit<Workshop, 'id' | 'created_at'>) => Promise<void>;
  updateWorkshop: (id: number, updates: Partial<Workshop>) => Promise<void>;
  deleteWorkshop: (id: number) => Promise<void>;
  addWorkshopProgram: (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => Promise<void>;
  updateWorkshopProgram: (id: number, updates: Partial<WorkshopProgram>) => Promise<void>;
  deleteWorkshopProgram: (id: number) => Promise<void>;
  addWorkshopResource: (r: Omit<WorkshopResource, 'id' | 'created_at'>) => Promise<void>;
  deleteWorkshopResource: (id: number) => Promise<void>;
}

// Workshop → category matching (used for notification preferences)
const WELLSHOP_TAG_MAP: Record<string, string[]> = {
  wellshop: ['wellshop', 'reflection', 'grounding', 'journaling', 'inner', 'nurture', 'decomprocess'],
  expresshop: ['expresshop', 'expression', 'sharing', 'presenting', 'pitching', 'storytelling', 'outer'],
  playshop: ['playshop', 'play', 'creative', 'show-and-tell', 'experiment', 'fun'],
};

function workshopMatchesCategory(w: Workshop, categoryKey: string): boolean {
  const keywords = WELLSHOP_TAG_MAP[categoryKey] || [];
  const titleLower = w.title.toLowerCase();
  const descLower = w.description.toLowerCase();
  const tagSet = (w.tags || []).map(t => t.toLowerCase());
  return keywords.some(kw => tagSet.includes(kw) || titleLower.includes(kw) || descLower.includes(kw));
}

export function createWorkshopActions(
  setWorkshops: React.Dispatch<React.SetStateAction<Workshop[]>>,
  setWorkshopPrograms: React.Dispatch<React.SetStateAction<WorkshopProgram[]>>,
  setWorkshopResources: React.Dispatch<React.SetStateAction<WorkshopResource[]>>,
  sendSystemMessage: (content: string) => void,
): WorkshopActions {
  return {
    async addWorkshop(w) {
      try {
        const created = await api.createWorkshop(w);
        setWorkshops(prev => [...prev, created]);
        for (const catKey of ['wellshop', 'expresshop', 'playshop']) {
          if (localStorage.getItem(`wellshop_notify_${catKey}`) === '1' && workshopMatchesCategory(created, catKey)) {
            sendSystemMessage(`🔔 a new ${catKey} just got scheduled: "${created.title}" — you asked to be notified!`);
            break;
          }
        }
      } catch (e) { console.error('Add workshop error:', e); }
    },

    async updateWorkshop(id, updates) {
      try {
        setWorkshops(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
        await api.updateWorkshop(id, updates);
      } catch (e) { console.error('Update workshop error:', e); }
    },

    async deleteWorkshop(id) {
      try {
        setWorkshops(prev => prev.filter(w => w.id !== id));
        await api.deleteWorkshop(id);
      } catch (e) { console.error('Delete workshop error:', e); }
    },

    async addWorkshopProgram(p) {
      try {
        const created = await api.createWorkshopProgram(p);
        setWorkshopPrograms(prev => [...prev, created]);
      } catch (e) { console.error('Add workshop program error:', e); }
    },

    async updateWorkshopProgram(id, updates) {
      try {
        setWorkshopPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        await api.updateWorkshopProgram(id, updates);
      } catch (e) { console.error('Update workshop program error:', e); }
    },

    async deleteWorkshopProgram(id) {
      try {
        setWorkshopPrograms(prev => prev.filter(p => p.id !== id));
        await api.deleteWorkshopProgram(id);
      } catch (e) { console.error('Delete workshop program error:', e); }
    },

    async addWorkshopResource(r) {
      try {
        const created = await api.createWorkshopResource(r);
        setWorkshopResources(prev => [...prev, created]);
      } catch (e) { console.error('Add workshop resource error:', e); }
    },

    async deleteWorkshopResource(id) {
      try {
        setWorkshopResources(prev => prev.filter(r => r.id !== id));
        await api.deleteWorkshopResource(id);
      } catch (e) { console.error('Delete workshop resource error:', e); }
    },
  };
}
