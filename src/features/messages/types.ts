import { Message } from '../../app/api';

export interface MessageDrawerProps {
  messages: Message[];
  onSend: (msg: Omit<Message, 'id' | 'created_at'>) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, content: string) => Promise<void>;
  onUpdateFields: (id: number, fields: Partial<Message>) => Promise<void>;
  onNavigateToForum?: () => void;
  onNavigateToGeyser?: () => void;
  onNavigateToStations?: () => void;
  onNavigateToPlayD8s?: () => void;
  activeAs: string;
  onSetActiveAs: (person: string) => void;
  onAddWellNote?: (content: string) => void;
}

export type MsgType = 'message' | 'update' | 'reminder' | 'idea' | 'forum';
export type ParsedPrefix = 'UPDATE' | 'REMINDER' | 'IDEA' | 'FORUM' | null;
export type MsgTag = 'urgent' | 'important' | 'pinned' | null;
export type ChatReply = { id: number; author: string; content: string; ts: string };
export type SyncMsg = Message & { isSync: true };
export type AnyMsg = (Message | SyncMsg) & { isSync?: boolean };
export type FilterMode = 'all' | 'pinned' | 'urgent';
