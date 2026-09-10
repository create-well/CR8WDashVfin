/**
 * Forum actions — extracted from DashboardContext.
 * Manages forum posts and replies with optimistic updates.
 */
import * as api from '../app/components/api';
import type { ForumPost, ForumReply } from '../app/components/api';

export interface ForumActions {
  addForumPost: (post: Omit<ForumPost, 'id' | 'created_at'>) => Promise<void>;
  updateForumPost: (id: number, updates: Partial<ForumPost>) => Promise<void>;
  deleteForumPost: (id: number) => Promise<void>;
  addForumReply: (postId: number, reply: { author: string; content: string }) => Promise<void>;
  deleteForumReply: (id: number) => Promise<void>;
}

export function createForumActions(
  setForum: React.Dispatch<React.SetStateAction<ForumPost[]>>,
  setForumReplies: React.Dispatch<React.SetStateAction<ForumReply[]>>,
  getForum: () => ForumPost[],
  sendSystemMessage: (content: string) => void,
): ForumActions {
  return {
    async addForumPost(post) {
      try {
        const created = await api.createForumPost(post);
        setForum(prev => [created, ...prev]);
        const authorLabel = post.author ? post.author.charAt(0).toUpperCase() + post.author.slice(1) : 'Someone';
        sendSystemMessage(`[UPDATE] 💬 ${authorLabel} dropped a new post in The Well${post.tag ? ` [${post.tag}]` : ''}`);
      } catch (e) { console.error('Add forum post error:', e); }
    },

    async updateForumPost(id, updates) {
      try {
        setForum(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        const updated = await api.updateForumPost(id, updates);
        setForum(prev => prev.map(p => p.id === id ? updated : p));
        const authorLabel = updates.author || getForum().find(p => p.id === id)?.author || 'Someone';
        sendSystemMessage(`[UPDATE] ✏️ ${authorLabel.charAt(0).toUpperCase() + authorLabel.slice(1)} edited a post in The Well`);
      } catch (e) { console.error('Update forum post error:', e); }
    },

    async deleteForumPost(id) {
      try {
        setForum(prev => prev.filter(p => p.id !== id));
        await api.deleteForumPost(id);
      } catch (e) { console.error('Delete forum post error:', e); }
    },

    async addForumReply(postId, reply) {
      const tempId = -Date.now();
      const optimistic: ForumReply = { id: tempId, postId, author: reply.author, content: reply.content, created_at: new Date().toISOString() };
      setForumReplies(prev => [...prev, optimistic]);
      try {
        const created = await api.createForumReply(postId, reply);
        setForumReplies(prev => prev.map(r => r.id === tempId ? { ...created, postId } : r));
      } catch (e) {
        console.error('Add forum reply error:', e);
        setForumReplies(prev => prev.filter(r => r.id !== tempId));
      }
    },

    async deleteForumReply(replyId) {
      try {
        setForumReplies(prev => prev.filter(r => r.id !== replyId));
        await api.deleteForumReply(replyId);
      } catch (e) { console.error('Delete forum reply error:', e); }
    },
  };
}
