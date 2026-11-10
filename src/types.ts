export type Priority = 'visok' | 'srednji' | 'nizak';
export type Recurrence = 'dnevno' | 'tjedno' | 'mjesečno' | null;
export type Tone = 'lav' | 'mint' | 'peach' | 'butter' | 'sky';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type TaskStatus = 'otvoreno' | 'u-tijeku' | 'ceka';
export type NoteSpace = 'posao' | 'privatno';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number; // 0–100 (computed from subtasks when there are any)
  waitingFor: string;
  start?: string; // YYYY-MM-DD
  notes?: string;
  done: boolean;
  priority: Priority;
  due?: string; // YYYY-MM-DD
  category: string;
  projectId?: string;
  subtasks: Subtask[];
  recurring: Recurrence;
  todayFocus?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  tone: Tone;
  location?: string;
  taskId?: string;
}

export type ProjectStatus = 'planirano' | 'u-tijeku' | 'na-cekanju' | 'zavrseno';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  deadline?: string;
  tone: Tone;
}

export interface Note {
  id: string;
  title: string;
  html: string;
  folder: string;
  space: NoteSpace;
  tags: string[];
  pinned: boolean;
  projectId?: string;
  updatedAt: string; // ISO datetime
}

export interface Txn {
  id: string;
  type: 'prihod' | 'rashod';
  amount: number;
  category: string;
  date: string;
  description: string;
  recurring: boolean;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
  tone: Tone;
}

export type InboxKind = 'ideja' | 'zadatak' | 'bilješka';

export interface InboxItem {
  id: string;
  text: string;
  kind: InboxKind;
  createdAt: string;
}

export type ThemePref = 'svijetla' | 'tamna' | 'sustav';

export interface SettingsData {
  name: string;
  email: string;
  theme: ThemePref;
  weekStartsMonday: boolean;
}

export interface AppData {
  version: number;
  tasks: Task[];
  events: CalEvent[];
  projects: Project[];
  notes: Note[];
  txns: Txn[];
  budgets: Budget[];
  goals: Goal[];
  inbox: InboxItem[];
  settings: SettingsData;
}

export type CollectionKey = 'tasks' | 'events' | 'projects' | 'notes' | 'txns' | 'goals' | 'inbox';
