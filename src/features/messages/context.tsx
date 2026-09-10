import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MessageDrawerProps, MsgType, MsgTag, FilterMode, ChatReply, AnyMsg, Message } from './types';
import { loadLocalReactions, saveLocalReactions, loadIdSet, saveIdSet, parseMsg, TYPE_PREFIX, MSG_TYPES } from './utils';
import { PERSONS } from '../../app/data';
import { showToast } from '../../app/Toast';

export interface MessageContextValue extends MessageDrawerProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  msgType: MsgType;
  setMsgType: React.Dispatch<React.SetStateAction<MsgType>>;
  sending: boolean;
  focusMode: boolean;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  replyToId: number | null;
  setReplyToId: React.Dispatch<React.SetStateAction<number | null>>;
  chatReplies: Record<number, ChatReply[]>;
  openReplies: Set<number>;
  setOpenReplies: React.Dispatch<React.SetStateAction<Set<number>>>;
  msgMenu: number | null;
  setMsgMenu: React.Dispatch<React.SetStateAction<number | null>>;
  reactionPicker: number | null;
  setReactionPicker: React.Dispatch<React.SetStateAction<number | null>>;
  filterMode: FilterMode;
  setFilterMode: React.Dispatch<React.SetStateAction<FilterMode>>;
  activeTag: MsgTag;
  setActiveTag: React.Dispatch<React.SetStateAction<MsgTag>>;
  hoveredMsgId: number | null;
  setHoveredMsgId: React.Dispatch<React.SetStateAction<number | null>>;
  localReactions: Record<number, Record<string, string[]>>;
  
  editingId: number | null;
  editText: string;
  setEditText: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmId: number | null;
  setDeleteConfirmId: React.Dispatch<React.SetStateAction<number | null>>;

  showPersonPicker: boolean;
  setShowPersonPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  inputFocused: boolean;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  showOlderMsgs: boolean;
  setShowOlderMsgs: React.Dispatch<React.SetStateAction<boolean>>;

  readIds: Set<number>;
  tappedIds: Set<number>;
  dismissedIds: Set<number>;
  
  bottomRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  editInputRef: React.RefObject<HTMLInputElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  
  unreadCount: number;
  handleSend: () => Promise<void>;
  toggleTag: (tag: MsgTag) => void;
  toggleMsgTag: (msgId: number, tag: MsgTag) => Promise<void>;
  toggleReaction: (msgId: number, emoji: string) => void;
  sendToWell: (msg: AnyMsg) => void;
  handleMsgPointerEnter: (id: number) => void;
  handleMsgPointerLeave: () => void;
  handleMsgTouchStart: (id: number) => void;
  handleMsgTouchEnd: () => void;
  startEdit: (msg: AnyMsg) => void;
  commitEdit: () => Promise<void>;
  cancelEdit: () => void;
  confirmDelete: (id: number) => void;
  executeDelete: () => void;
  dismissMsg: (id: number) => void;
  undismissAll: () => void;
  handleNavClick: (msgId: number, action: (() => void) | null) => void;
  getNavTarget: (content: string) => { label: string; action: (() => void) | null };
  observeMsg: (el: HTMLDivElement | null) => void;
}

const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessageContext = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessageContext must be used within MessageProvider');
  return ctx;
};

export const MessageProvider: React.FC<MessageDrawerProps & { children: React.ReactNode }> = (props) => {
  const { messages, onSend, onDelete, onUpdate, onUpdateFields, activeAs, onAddWellNote } = props;
  const [open,           setOpen]           = useState(false);
  const [text,           setText]           = useState('');
  const [msgType,        setMsgType]        = useState<MsgType>('message');
  const [sending,        setSending]        = useState(false);
  const [focusMode,      setFocusMode]      = useState(false);
  const [replyToId,      setReplyToId]      = useState<number | null>(null);
  const [chatReplies,    setChatReplies]    = useState<Record<number, ChatReply[]>>({});
  const [openReplies,    setOpenReplies]    = useState<Set<number>>(new Set());
  const [msgMenu,        setMsgMenu]        = useState<number | null>(null);
  const [reactionPicker, setReactionPicker] = useState<number | null>(null);
  const [filterMode,     setFilterMode]     = useState<FilterMode>('all');
  const [activeTag,      setActiveTag]      = useState<MsgTag>(null);
  const [hoveredMsgId,   setHoveredMsgId]   = useState<number | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<number, Record<string, string[]>>>(loadLocalReactions);

  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [editText,       setEditText]       = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [showFilters,      setShowFilters]      = useState(false);
  const [inputFocused,     setInputFocused]     = useState(false);
  const [showOlderMsgs,    setShowOlderMsgs]    = useState(false);

  const readKey = `cr8w_read_${activeAs}`;
  const tappedKey = `cr8w_tapped_${activeAs}`;
  const dismissedKey = `cr8w_dismissed_${activeAs}`;
  
  const [readIds, setReadIds] = useState<Set<number>>(() => loadIdSet(readKey));
  const [tappedIds, setTappedIds] = useState<Set<number>>(() => loadIdSet(tappedKey));
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => loadIdSet(dismissedKey));

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReadIds(loadIdSet(`cr8w_read_${activeAs}`));
    setTappedIds(loadIdSet(`cr8w_tapped_${activeAs}`));
    setDismissedIds(loadIdSet(`cr8w_dismissed_${activeAs}`));
  }, [activeAs]);

  useEffect(() => { saveIdSet(readKey, readIds); }, [readIds, readKey]);
  useEffect(() => { saveIdSet(tappedKey, tappedIds); }, [tappedIds, tappedKey]);
  useEffect(() => { saveIdSet(dismissedKey, dismissedIds); }, [dismissedIds, dismissedKey]);

  useEffect(() => {
    const ownIds = messages.filter(m => m.author === activeAs).map(m => m.id);
    if (ownIds.length > 0) {
      setReadIds(prev => {
        const next = new Set(prev);
        let changed = false;
        ownIds.forEach(id => { if (!next.has(id)) { next.add(id); changed = true; } });
        return changed ? next : prev;
      });
    }
  }, [messages, activeAs]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerMap = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const markAsRead = useCallback((id: number) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = Number(entry.target.getAttribute('data-msg-id'));
        if (!id || isNaN(id)) return;
        if (entry.isIntersecting) {
          if (!timerMap.current.has(id)) {
            timerMap.current.set(id, setTimeout(() => {
              markAsRead(id);
              timerMap.current.delete(id);
            }, 2000));
          }
        } else {
          const t = timerMap.current.get(id);
          if (t) { clearTimeout(t); timerMap.current.delete(id); }
        }
      });
    }, { threshold: 0.5 });

    return () => {
      observerRef.current?.disconnect();
      timerMap.current.forEach(t => clearTimeout(t));
      timerMap.current.clear();
    };
  }, [open, markAsRead]);

  const observeMsg = useCallback((el: HTMLDivElement | null) => {
    if (el && observerRef.current) observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  useEffect(() => {
    if (editingId !== null) setTimeout(() => editInputRef.current?.focus(), 50);
  }, [editingId]);

  useEffect(() => {
    if (msgMenu === null) return;
    const dismiss = () => setMsgMenu(null);
    document.addEventListener('click', dismiss, { once: true });
    return () => document.removeEventListener('click', dismiss);
  }, [msgMenu]);

  const unreadMsgIds = useMemo(() => {
    return messages.filter(m => m.id > 0 && !readIds.has(m.id) && !dismissedIds.has(m.id)).map(m => m.id);
  }, [messages, readIds, dismissedIds]);
  const unreadCount = unreadMsgIds.length;

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const quietMode = parseInt(localStorage.getItem('visibilityDial') || '1') === 0;
    const sendAuthor = quietMode ? 'a co-creator' : activeAs;
    try {
      if (replyToId !== null) {
        const reply: ChatReply = { id: Date.now(), author: sendAuthor, content: text.trim(), ts: 'just now' };
        setChatReplies(prev => ({ ...prev, [replyToId]: [...(prev[replyToId] || []), reply] }));
        setOpenReplies(prev => new Set([...prev, replyToId]));
        setReplyToId(null);
      } else {
        const msgPayload: Omit<Message, 'id' | 'created_at'> = {
          author: sendAuthor,
          content: TYPE_PREFIX[msgType] + text.trim(),
        };
        if (activeTag) msgPayload.tag = activeTag;
        await onSend(msgPayload);
      }
      setText('');
      setActiveTag(null);
      setMsgType('message');
    } catch (e) {
      console.error('MessageDrawer send error:', e);
    } finally {
      setSending(false);
    }
  }

  function toggleTag(tag: MsgTag) { setActiveTag(prev => prev === tag ? null : tag); }

  async function toggleMsgTag(msgId: number, tag: MsgTag) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newTag = msg.tag === tag ? null : tag;
    await onUpdateFields(msgId, { tag: newTag });
    setMsgMenu(null);
  }

  function toggleReaction(msgId: number, emoji: string) {
    setLocalReactions(prev => {
      const next = { ...prev };
      if (!next[msgId]) next[msgId] = {};
      const users = next[msgId][emoji] ? [...next[msgId][emoji]] : [];
      const idx = users.indexOf(activeAs);
      if (idx >= 0) users.splice(idx, 1);
      else users.push(activeAs);
      if (users.length > 0) next[msgId] = { ...next[msgId], [emoji]: users };
      else { const r = { ...next[msgId] }; delete r[emoji]; next[msgId] = r; }
      if (Object.keys(next[msgId]).length === 0) delete next[msgId];
      saveLocalReactions(next);
      return next;
    });
    setReactionPicker(null);
    setHoveredMsgId(null);
  }

  function sendToWell(msg: AnyMsg) {
    const { body } = parseMsg(msg.content || '');
    if (onAddWellNote && body.trim()) {
      onAddWellNote(body.trim());
      showToast('\u{1F4A7} dropped in the well.', 'well');
    }
    setHoveredMsgId(null);
  }

  function handleMsgPointerEnter(id: number) { setHoveredMsgId(id); }
  function handleMsgPointerLeave() { setHoveredMsgId(null); if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }
  function handleMsgTouchStart(id: number) { longPressRef.current = setTimeout(() => setHoveredMsgId(id), 400); }
  function handleMsgTouchEnd() { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }

  function startEdit(msg: AnyMsg) {
    const { body } = parseMsg(msg.content || '');
    setEditingId(msg.id);
    setEditText(body);
    setMsgMenu(null);
  }

  async function commitEdit() {
    if (editingId === null || !editText.trim()) { cancelEdit(); return; }
    const origMsg = messages.find(m => m.id === editingId);
    if (!origMsg) { cancelEdit(); return; }
    const { prefix } = parseMsg(origMsg.content || '');
    const prefixStr = prefix ? `[${prefix}] ` : '';
    await onUpdate(editingId, prefixStr + editText.trim());
    cancelEdit();
  }

  function cancelEdit() { setEditingId(null); setEditText(''); }

  function confirmDelete(id: number) { setDeleteConfirmId(id); setMsgMenu(null); }
  function executeDelete() {
    if (deleteConfirmId === null) return;
    onDelete(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  function dismissMsg(id: number) {
    setDismissedIds(prev => { const n = new Set(prev); n.add(id); return n; });
  }

  function undismissAll() {
    setDismissedIds(new Set());
  }

  function getNavTarget(content: string): { label: string; action: (() => void) | null } {
    const lower = content.toLowerCase();
    if (lower.includes('playd8s') || lower.includes('check-in') || lower.includes('wednesday') || lower.includes('co-flow'))
      return { label: 'Go to PlayD8s \u2192', action: props.onNavigateToPlayD8s || null };
    if (lower.includes('the well') || lower.includes('forum') || lower.includes('well post') || lower.includes('well drop') || lower.includes('posted') || lower.includes('[forum]'))
      return { label: 'Go to The Well \u2192', action: props.onNavigateToForum || null };
    if (lower.includes('station'))
      return { label: 'Go to Stations \u2192', action: props.onNavigateToStations || null };
    if (lower.includes('geyser') || lower.includes('task'))
      return { label: 'Go to Geyser \u2192', action: props.onNavigateToGeyser || null };
    return { label: 'Go to The Well \u2192', action: props.onNavigateToForum || null };
  }

  function handleNavClick(msgId: number, action: (() => void) | null) {
    if (action) {
      setTappedIds(prev => { const n = new Set(prev); n.add(msgId); return n; });
      markAsRead(msgId);
      setOpen(false);
      setTimeout(() => action(), 80);
    }
  }

  return (
    <MessageContext.Provider value={{
      ...props,
      open, setOpen, text, setText, msgType, setMsgType, sending, focusMode, setFocusMode,
      replyToId, setReplyToId, chatReplies, openReplies, setOpenReplies, msgMenu, setMsgMenu,
      reactionPicker, setReactionPicker, filterMode, setFilterMode, activeTag, setActiveTag,
      hoveredMsgId, setHoveredMsgId, localReactions, editingId, editText, setEditText,
      deleteConfirmId, setDeleteConfirmId, showPersonPicker, setShowPersonPicker, showFilters, setShowFilters,
      inputFocused, setInputFocused, showOlderMsgs, setShowOlderMsgs,
      readIds, tappedIds, dismissedIds,
      bottomRef, inputRef, editInputRef, scrollRef, unreadCount,
      handleSend, toggleTag, toggleMsgTag, toggleReaction, sendToWell, handleMsgPointerEnter, handleMsgPointerLeave,
      handleMsgTouchStart, handleMsgTouchEnd, startEdit, commitEdit, cancelEdit, confirmDelete, executeDelete,
      dismissMsg, undismissAll, handleNavClick, getNavTarget, observeMsg
    }}>
      {props.children}
    </MessageContext.Provider>
  );
};
