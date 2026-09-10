/**
 * Station actions — extracted from DashboardContext.
 * Manages station CRUD with optimistic updates.
 */
import * as api from '../app/components/api';
import type { Station } from '../app/components/api';

export interface StationActions {
  addStation: (s: Omit<Station, 'id' | 'created_at'>) => Promise<void>;
  updateStationStatus: (id: number, status: string) => Promise<void>;
  updateStationOwner: (id: number, owner: string) => Promise<void>;
  updateStationField: (id: number, updates: Partial<Station>) => Promise<void>;
  deleteStation: (id: number) => Promise<void>;
}

export function createStationActions(
  setStations: React.Dispatch<React.SetStateAction<Station[]>>,
): StationActions {
  return {
    async addStation(s) {
      try {
        const created = await api.createStation(s);
        setStations(prev => [...prev, created]);
      } catch (e) { console.error('Add station error:', e); }
    },

    async updateStationStatus(id, status) {
      try {
        setStations(prev => prev.map(s => s.id === id ? { ...s, status } : s));
        await api.updateStation(id, { status });
      } catch (e) { console.error('Update station status error:', e); }
    },

    async updateStationOwner(id, owner) {
      try {
        setStations(prev => prev.map(s => s.id === id ? { ...s, owner } : s));
        await api.updateStation(id, { owner });
      } catch (e) { console.error('Update station owner error:', e); }
    },

    async updateStationField(id, updates) {
      try {
        setStations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        await api.updateStation(id, updates);
      } catch (e) { console.error('Update station field error:', e); }
    },

    async deleteStation(id) {
      try {
        setStations(prev => prev.filter(s => s.id !== id));
        await api.deleteStation(id);
      } catch (e) { console.error('Delete station error:', e); }
    },
  };
}
