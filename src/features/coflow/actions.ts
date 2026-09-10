/**
 * CoFlow actions — extracted from DashboardContext.
 * Manages CoFlow dates (behind h0es doors) and check-ins with optimistic updates.
 */
import * as api from '../app/components/api';
import type { CoFlowDate, CoFlowCheckin } from '../app/components/api';

export interface CoFlowActions {
  addCoFlowDate: (d: Omit<CoFlowDate, 'id' | 'created_at'>) => Promise<void>;
  updateCoFlowDate: (id: number, updates: Partial<CoFlowDate>) => Promise<void>;
  deleteCoFlowDate: (id: number) => Promise<void>;
  addCoFlowCheckin: (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => Promise<void>;
  deleteCoFlowCheckin: (id: number) => Promise<void>;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function createCoFlowActions(
  setCoFlowDates: React.Dispatch<React.SetStateAction<CoFlowDate[]>>,
  setCoFlowCheckins: React.Dispatch<React.SetStateAction<CoFlowCheckin[]>>,
  getCoFlowDates: () => CoFlowDate[],
  sendSystemMessage: (content: string) => void,
): CoFlowActions {
  return {
    async addCoFlowDate(d) {
      try {
        const created = await api.createCoFlowDate(d);
        setCoFlowDates(prev => [...prev, created]);
        const hostLabel = d.host ? capitalize(d.host) : 'Someone';
        const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const timeStr = d.startTime && d.endTime ? `${d.startTime} – ${d.endTime}` : d.timeRange || 'TBD';
        sendSystemMessage(`[UPDATE] 🗓️ New behind h0es doors scheduled! ${dateLabel} · ${timeStr} · ${d.location || 'TBD'}${d.host ? ` · Hosted by ${hostLabel}` : ''}${d.theme ? ` · "${d.theme}"` : ''}`);
      } catch (e) { console.error('Add coflow date error:', e); }
    },

    async updateCoFlowDate(id, updates) {
      try {
        const prev = getCoFlowDates().find(d => d.id === id);
        setCoFlowDates(p => p.map(d => d.id === id ? { ...d, ...updates } : d));
        await api.updateCoFlowDate(id, updates);
        if (prev && (updates.date || updates.startTime || updates.endTime || updates.location || updates.host || updates.theme) && updates.status !== 'archived') {
          const dateLabel = new Date((updates.date || prev.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          sendSystemMessage(`[UPDATE] ✏️ behind h0es doors updated → ${dateLabel} · ${updates.location || prev.location || 'TBD'}`);
        }
        if (updates.status === 'archived' && prev) {
          const dateLabel = new Date(prev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          sendSystemMessage(`[UPDATE] 📚 behind h0es doors (${dateLabel}) has been archived.`);
        }
      } catch (e) { console.error('Update coflow date error:', e); }
    },

    async deleteCoFlowDate(id) {
      try {
        const d8 = getCoFlowDates().find(d => d.id === id);
        setCoFlowDates(prev => prev.filter(d => d.id !== id));
        await api.deleteCoFlowDate(id);
        if (d8) {
          const dateLabel = new Date(d8.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          sendSystemMessage(`[UPDATE] ❌ behind h0es doors on ${dateLabel} has been cancelled.`);
        }
      } catch (e) { console.error('Delete coflow date error:', e); }
    },

    async addCoFlowCheckin(c) {
      try {
        const created = await api.createCoFlowCheckin(c);
        setCoFlowCheckins(prev => [...prev, created]);
        const authorLabel = c.author ? c.author.charAt(0).toUpperCase() + c.author.slice(1) : 'Someone';
        const moodEmojis: Record<string, string> = { fire: '🔥', sun: '☀️', cloud: '☁️', rain: '🌧️', storm: '⛈️' };
        const moodStr = c.mood && moodEmojis[c.mood] ? ` ${moodEmojis[c.mood]}` : '';
        const agendaCount = c.agendaItems?.length || 0;
        sendSystemMessage(`[UPDATE] ✅ ${authorLabel} dropped a PlayD8s check-in${moodStr}${agendaCount > 0 ? ` with ${agendaCount} agenda item${agendaCount > 1 ? 's' : ''}` : ''}. ${c.confirmTime ? 'Time confirmed ✓' : 'Time needs adjusting ⚠️'}`);
      } catch (e) { console.error('Add coflow checkin error:', e); }
    },

    async deleteCoFlowCheckin(id) {
      try {
        setCoFlowCheckins(prev => prev.filter(c => c.id !== id));
        await api.deleteCoFlowCheckin(id);
      } catch (e) { console.error('Delete coflow checkin error:', e); }
    },
  };
}
