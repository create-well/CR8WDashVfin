export interface Person {
  name: string; fullName?: string; role: string; expression: string;
  color: string; emoji: string; authority: string;
  energyReminder: { type: string; text: string; detail: string; };
}

export interface CalendarEvent {
  date: string; title: string; time?: string; location?: string;
  type: 'bhd' | 'cr8w' | 'personal' | 'launch'; persons: string[];
}

export interface ActionItem {
  id: number; person: string; title: string; status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low'; due_date?: string; source?: string; category?: string;
  created_at?: string;
}

export interface MomentumItem {
  id: number; person: string; content: string; item_type: string; created_at?: string;
}

export interface NoteItem {
  id: number; author: string; content: string; created_at?: string;
}

export interface HDProfile {
  type: string; typeShort: string; profile: string; profileName: string;
  authority: string; strategy: string; signature: string; notSelf: string;
  definition: string; sacralDefined: boolean; auraType: string;
  centers: { defined: string[]; undefined: string[]; };
  typeDescription: string; strategyDetail: string; authorityDetail: string;
  profileDetail: Record<string, string>;
  definitionDetail: string; livingYourDesign: string[]; hdQuotes: string[];
}

export type PhaseTag = 'cohoe' | 'concepting' | 'coordinating' | 'marketing' | 'day-of' | 'decompressing' | 'depanty';

export interface InviteCounts {
  confirmed: number;
  pending: number;
  declined: number;
  maybe: number;
  total: number;
  updated_at?: string;
}

export interface Task {
  id: number; person: string; title: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  due_date?: string; source?: string; category?: string; created_at?: string;
}

export interface Station {
  id: number; emoji: string; name: string; status: string;
  description: string; owner: string; created_at?: string;
}

export interface ForumPost {
  id: number; author: string; content: string; tag?: string; created_at?: string;
}

export interface ForumReply {
  id: number; postId: number; author: string; content: string; created_at?: string;
}

export interface Message {
  id: number; author: string; content: string;
  tag?: 'urgent' | 'important' | 'pinned' | null;
  reactions?: Record<string, string[]>; // emoji → array of person keys who reacted
  reaction?: string; edited?: boolean; created_at?: string;
}

export interface BrainDump {
  id: number; author: string; content: string; tags?: string; drive_link?: string; created_at?: string;
}

export interface Announcement {
  id: number; text: string; priority: 'high' | 'medium' | 'low'; active?: number; created_at?: string;
}

export interface Workshop {
  id: number;
  title: string;
  description: string;
  facilitator: 'monny' | 'sunshine' | 'bingle';
  date: string;
  capacity: number;
  participants: number;
  location: string;
  tags: string[];
  googleDocLink?: string;
  status: 'ideation' | 'planning' | 'scheduled' | 'completed';
  created_at?: string;
}

export interface WorkshopProgram {
  id: number;
  seriesName: string;
  description: string;
  learningObjectives: string[];
  sessionOutline: { number: number; title: string; description: string }[];
  targetAudience: string;
  materialsNeeded: string[];
  facilitator: string;
  created_at?: string;
}

export interface WorkshopResource {
  id: number;
  title: string;
  type: 'google-doc' | 'meeting-notes' | 'template' | 'recording';
  url: string;
  lastUpdated: string;
  author: string;
  created_at?: string;
}

export interface CoFlowDate {
  id: number;
  date: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  location: string;
  host?: string;
  theme?: string;
  rsvp: Record<string, string>;
  agendaItems: { id: number; text: string; lead: string; timeEstimate: number; done: boolean }[];
  agendaLocked?: boolean;
  notes: string;
  vibeCheck: string;
  sessionNotes?: string;
  attendees?: string[];
  status: 'upcoming' | 'active' | 'archived';
  created_at?: string;
}

export interface CoFlowCheckin {
  id: number;
  weekOf: string;
  author: string;
  confirmTime: boolean;
  locationSuggestion: string;
  agendaItems: string[];
  mood?: string;
  timePreference?: string;
  notes?: string;
  created_at?: string;
}

export interface WellNote {
  id: number;
  content: string;
  landed: number;
  created_at?: string;
}

export interface SyncData {
  tasks: Task[];
  stations: Station[];
  forum: ForumPost[];
  messages: Message[];
  braindumps: BrainDump[];
  announcements: Announcement[];
  forumReplies: ForumReply[];
  workshops: Workshop[];
  workshopPrograms: WorkshopProgram[];
  workshopResources: WorkshopResource[];
  coflowDates: CoFlowDate[];
  coflowCheckins: CoFlowCheckin[];
  wellNotes: WellNote[];
  calendarEvents: CalendarEventKV[];
}

export interface CalendarEventKV {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
  creator: string;
  synced_at?: string;
}

export interface ParkingLotItem {
  id: string;
  text: string;
  category: 'spark' | 'question' | 'resource' | 'wild card';
  author: string;
  created_at: string;
}

export type SyncStatus = 'loading' | 'fresh' | 'stale' | 'failed';

export interface DashboardPermissions {
  careConsent: boolean;
}

export interface DashboardPayload {
  tasks: Task[];
  stations: Station[];
  forum: ForumPost[];
  messages: Message[];
  brainDumps: BrainDump[];
  announcements: Announcement[];
  forumReplies: ForumReply[];
  workshops: Workshop[];
  workshopPrograms: WorkshopProgram[];
  workshopResources: WorkshopResource[];
  coFlowDates: CoFlowDate[];
  coFlowCheckins: CoFlowCheckin[];
  wellNotes: WellNote[];
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  permissions: DashboardPermissions;
}

export interface DashboardActions {
  addTask: (t: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: number, status: Task['status']) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;

  addStation: (s: Omit<Station, 'id' | 'created_at'>) => Promise<void>;
  updateStationStatus: (id: number, status: string) => Promise<void>;
  updateStationOwner: (id: number, owner: string) => Promise<void>;
  updateStationField: (id: number, updates: Partial<Station>) => Promise<void>;
  deleteStation: (id: number) => Promise<void>;

  addForumPost: (p: Omit<ForumPost, 'id' | 'created_at'>) => Promise<void>;
  updateForumPost: (id: number, updates: Partial<ForumPost>) => Promise<void>;
  deleteForumPost: (id: number) => Promise<void>;

  addForumReply: (postId: number, r: { author: string; content: string }) => Promise<void>;
  deleteForumReply: (id: number) => Promise<void>;

  sendMessage: (m: Omit<Message, 'id' | 'created_at'>) => Promise<void>;
  updateMessage: (id: number, content: string) => Promise<void>;
  updateMessageFields: (id: number, fields: Partial<Message>) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;

  addBrainDump: (d: Omit<BrainDump, 'id' | 'created_at'>) => Promise<void>;
  deleteBrainDump: (id: number) => Promise<void>;

  dismissAnnouncement: (id: number) => Promise<void>;
  addAnnouncement: () => Promise<void>;

  addWorkshop: (w: Omit<Workshop, 'id' | 'created_at'>) => Promise<void>;
  updateWorkshop: (id: number, updates: Partial<Workshop>) => Promise<void>;
  deleteWorkshop: (id: number) => Promise<void>;
  addWorkshopProgram: (p: Omit<WorkshopProgram, 'id' | 'created_at'>) => Promise<void>;
  updateWorkshopProgram: (id: number, updates: Partial<WorkshopProgram>) => Promise<void>;
  deleteWorkshopProgram: (id: number) => Promise<void>;
  addWorkshopResource: (r: Omit<WorkshopResource, 'id' | 'created_at'>) => Promise<void>;
  deleteWorkshopResource: (id: number) => Promise<void>;

  addCoFlowDate: (d: Omit<CoFlowDate, 'id' | 'created_at'>) => Promise<void>;
  updateCoFlowDate: (id: number, updates: Partial<CoFlowDate>) => Promise<void>;
  deleteCoFlowDate: (id: number) => Promise<void>;
  addCoFlowCheckin: (c: Omit<CoFlowCheckin, 'id' | 'created_at'>) => Promise<void>;
  deleteCoFlowCheckin: (id: number) => Promise<void>;

  addWellNote: (content: string) => Promise<void>;
  landWellNote: (id: number) => Promise<void>;

  retrySync: () => void;
  signOut: () => Promise<void>;
}

export interface DashboardUI {
  chatActiveUser: string;
  setChatActiveUser: (user: string) => void;
  activePerson: string | null;
  setActivePerson: (person: string | null) => void;
  showWelcome: boolean;
  setShowWelcome: (v: boolean) => void;
  movesDefaultTab: 'overview' | 'stations' | 'forum';
  setMovesDefaultTab: (tab: 'overview' | 'stations' | 'forum') => void;
}

export interface DashboardContextValue {
  data: DashboardPayload;
  actions: DashboardActions;
  ui: DashboardUI;
}
