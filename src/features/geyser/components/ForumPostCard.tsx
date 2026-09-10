import React, { useState } from 'react';
import type { ForumPost, ForumReply as ApiForumReply } from '../../../app/components/api';
import { PERSONS, capitalize, formatTimestamp, PHASE_META } from '../../../app/components/data';
import type { ForumReply } from '../types';

interface ForumPostCardProps {
  post: ForumPost;
  replies: (ForumReply | ApiForumReply)[];
  isSeed: boolean;
  forumAuthor: string;
  onUpdateForumPost?: (id: number, updates: Partial<ForumPost>) => void;
  onDeleteForumPost: (id: number) => void;
  onAddForumReply?: (postId: number, reply: { author: string; content: string }) => void;
  onDeleteForumReply?: (replyId: number) => void;
}

export function ForumPostCard({
  post, replies, isSeed, forumAuthor, onUpdateForumPost, onDeleteForumPost,
  onAddForumReply, onDeleteForumReply
}: ForumPostCardProps) {
  const [editingForumId, setEditingForumId] = useState<number | null>(null);
  const [editForumDraft, setEditForumDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');

  const author = PERSONS[post.author];

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: author?.color || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
          {author?.emoji || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: author?.color || 'var(--text-primary)' }}>{capitalize(post.author)}</span>
            {post.tag && (() => {
              const pm = PHASE_META[post.tag];
              return (
                <span style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 10, fontFamily: 'var(--font-label)', fontWeight: 600, background: pm ? `${pm.color}22` : 'var(--sandstone)', color: pm ? pm.color : 'var(--text-secondary)', border: pm ? `1px solid ${pm.color}50` : 'none' }}>
                  {pm ? `${pm.emoji} ${pm.label}` : post.tag}
                </span>
              );
            })()}
            <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{formatTimestamp(post.created_at)}</span>
          </div>
          {editingForumId === post.id ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <textarea value={editForumDraft} onChange={e => setEditForumDraft(e.target.value)} rows={2} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', color: 'var(--text-primary)', resize: 'vertical' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => { onUpdateForumPost?.(post.id, { content: editForumDraft.trim() }); setEditingForumId(null); }} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontSize: '0.68rem', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingForumId(null)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'transparent', fontSize: '0.68rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {post.content}
            </div>
          )}
        </div>
        {!isSeed && editingForumId !== post.id && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { setEditingForumId(post.id); setEditForumDraft(post.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--text-muted)' }}>✏️</button>
            <button onClick={() => onDeleteForumPost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--text-muted)' }}>🗑</button>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div style={{ marginLeft: 42, borderLeft: '2px solid var(--border-soft)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {replies.map((reply: any) => {
            const replyAuthor = PERSONS[reply.author];
            const isApi = 'postId' in reply;
            return (
              <div key={reply.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: replyAuthor?.color || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}>
                  {replyAuthor?.emoji || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', fontWeight: 600, color: replyAuthor?.color || 'var(--text-secondary)' }}>{capitalize(reply.author)}</span>
                  <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 6 }}>{'ts' in reply ? reply.ts : formatTimestamp(reply.created_at)}</span>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                    {reply.content}
                  </div>
                </div>
                {isApi && (
                  <button onClick={() => onDeleteForumReply?.(reply.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6rem', color: 'var(--text-muted)' }}>🗑</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply compose */}
      <div style={{ marginLeft: 42, marginTop: 8, display: 'flex', gap: 6 }}>
        <input
          value={replyDraft}
          onChange={e => setReplyDraft(e.target.value)}
          placeholder="reply…"
          onKeyDown={e => {
            if (e.key === 'Enter' && replyDraft.trim()) {
              onAddForumReply?.(post.id, { author: forumAuthor, content: replyDraft.trim() });
              setReplyDraft('');
            }
          }}
          style={{ flex: 1, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', background: 'transparent', color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => {
            if (replyDraft.trim()) {
              onAddForumReply?.(post.id, { author: forumAuthor, content: replyDraft.trim() });
              setReplyDraft('');
            }
          }}
          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontFamily: 'var(--font-label)', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
