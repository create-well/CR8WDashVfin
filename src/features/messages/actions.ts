/**
 * Message actions — extracted from DashboardContext.
 * Manages chat messages with optimistic updates.
 */
import * as api from '../app/components/api';
import type { Message } from '../app/components/api';

export interface MessageActions {
  sendMessage: (msg: Omit<Message, 'id' | 'created_at'>) => Promise<void>;
  updateMessage: (id: number, content: string) => Promise<void>;
  updateMessageFields: (id: number, fields: Partial<Message>) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
}

export function createMessageActions(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
): MessageActions {
  return {
    async sendMessage(msg) {
      const tempId = -Date.now();
      const optimistic: Message = { ...msg, id: tempId, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, optimistic]);
      try {
        const created = await api.sendMessage(msg);
        setMessages(prev => prev.map(m => m.id === tempId ? created : m));
      } catch (e) {
        console.error('Send message error:', e);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    },

    async updateMessage(id, content) {
      try {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
        await api.updateMessage(id, { content, edited: true });
      } catch (e) { console.error('Update message error:', e); }
    },

    async updateMessageFields(id, fields) {
      try {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
        await api.updateMessage(id, fields);
      } catch (e) { console.error('Update message fields error:', e); }
    },

    async deleteMessage(id) {
      try {
        setMessages(prev => prev.filter(m => m.id !== id));
        await api.deleteMessage(id);
      } catch (e) { console.error('Delete message error:', e); }
    },
  };
}
