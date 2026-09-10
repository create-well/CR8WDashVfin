import React, { useState } from 'react';
import type { ForumPost, ForumReply as ApiForumReply } from '../../../app/components/api';
import { PERSONS, PHASE_TAGS, PHASE_META } from '../../../app/components/data';
import { ForumPostCard } from './ForumPostCard';
import { SEED_POSTS, SEED_REPLIES } from '../utils';

interface ForumSectionProps {
  forum: ForumPost[];
  forumReplies?: ApiForumReply[];
  onAddForumPost: (post: Omit<ForumPost, 'id' | 'created_at'>) => void;
  onUpdateForumPost?: (id: number, updates: Partial<ForumPost>) => void;
  onDeleteForumPost: (id: number) => void;
  onAddForumReply?: (postId: number, reply: { author: string; content: string }) => void;
  onDeleteForumReply?: (replyId: number) => void;
}

export function ForumSection({
  forum, forumReplies, onAddForumPost, onUpdateForumPost,
  onDeleteForumPost, onAddForumReply, onDeleteForumReply
}: ForumSectionProps) {
  const [forumAuthor, setForumAuthor] = useState<string>('sunshine');
  const [forumDraft, setForumDraft] = useState('');
  const [forumTag, setForumTag] = useState<string>('update');

  const allPosts = [...SEED_POSTS, ...forum].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  function getRepliesForPost(postId: number) {
    const seed = SEED_REPLIES[postId] || [];
    const api = (forumReplies || []).filter(r => r.postId === postId);
    return [...seed, ...api];
  }

  return (
    <div className="geyser-tab-content">
      <h3 className="geyser-section-title">💬 Co-Creator Forum</h3>

      {/* Author select */}
      <div className="geyser-forum-author-select">
        <span style={{ fontFamily: 'var(--font-label)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Posting as:</span>
        {Object.entries(PERSONS).map(([key, person]) => (
          <button key={key} onClick={() => setForumAuthor(key)} style={{ width: 30, height: 30, borderRadius: '50%', border: forumAuthor === key ? `2px solid ${person.color}` : '2px solid transparent', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s' }}>
            {person.emoji}
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select value={forumTag} onChange={e => setForumTag(e.target.value)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-label)', fontSize: '0.72rem', background: 'var(--bg-elevated,#FAFAF8)', color: 'var(--text-secondary)' }}>
            <optgroup label="Thread Type">
              <option value="update">Update</option>
              <option value="decision">Decision</option>
              <option value="reminder">Reminder</option>
              <option value="idea">Idea</option>
              <option value="question">Question</option>
            </optgroup>
            <optgroup label="── Event Phase ──">
              {(PHASE_TAGS as readonly string[]).map(p => {
                const m = PHASE_META[p];
                return <option key={p} value={p}>{m.emoji} {m.label}</option>;
              })}
            </optgroup>
          </select>
          {PHASE_META[forumTag] && (
            <div style={{ flex: 1, padding: '4px 10px', borderRadius: 6, background: `${PHASE_META[forumTag].color}18`, border: `1px solid ${PHASE_META[forumTag].color}40`, fontFamily: 'var(--font-body)', fontSize: '0.69rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {PHASE_META[forumTag].desc}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={forumDraft}
            onChange={e => setForumDraft(e.target.value)}
            placeholder="start a new thread…"
            rows={2}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', background: 'transparent', color: 'var(--text-primary)', resize: 'vertical' }}
          />
          <button
            onClick={() => {
              if (forumDraft.trim()) {
                onAddForumPost({ author: forumAuthor, content: forumDraft.trim(), tag: forumTag });
                setForumDraft('');
              }
            }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--cr8w-primary)', color: '#fff', fontFamily: 'var(--font-label)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
          >
            Post
          </button>
        </div>
      </div>

      {/* Threads */}
      {allPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>💬</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            no threads yet — start a conversation above
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {allPosts.map(post => {
            const replies = getRepliesForPost(post.id);
            const isSeed = post.id >= 9000;
            return (
              <ForumPostCard
                key={post.id}
                post={post}
                replies={replies}
                isSeed={isSeed}
                forumAuthor={forumAuthor}
                onUpdateForumPost={onUpdateForumPost}
                onDeleteForumPost={onDeleteForumPost}
                onAddForumReply={onAddForumReply}
                onDeleteForumReply={onDeleteForumReply}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
