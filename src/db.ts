import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';
import type { AppData, Budget, CalEvent, CollectionKey, Goal, InboxItem, Note, Project, SettingsData, Task, Txn } from './types';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** App collection → database table */
export const TABLE: Record<CollectionKey, string> = {
  tasks: 'tasks',
  events: 'events',
  projects: 'projects',
  notes: 'notes',
  txns: 'transactions',
  goals: 'goals',
  inbox: 'inbox_items',
};
export const COLLECTION_BY_TABLE: Record<string, CollectionKey> = Object.fromEntries(
  Object.entries(TABLE).map(([k, v]) => [v, k as CollectionKey]),
);

type Row = Record<string, any>;
const n = (v: unknown) => (v === undefined ? null : v);
const num = (v: unknown) => Number(v ?? 0);

/* ───────── row → app ───────── */
export const fromRow = {
  tasks: (r: Row): Task => ({
    id: r.id, title: r.title, notes: r.notes ?? '', done: r.done, status: r.status ?? 'otvoreno', progress: r.progress ?? 0,
    waitingFor: r.waiting_for ?? '', start: r.start_date ?? undefined, priority: r.priority, due: r.due ?? undefined,
    category: r.category, projectId: r.project_id ?? undefined, subtasks: Array.isArray(r.subtasks) ? r.subtasks : [],
    recurring: r.recurring ?? null, todayFocus: r.today_focus, createdAt: String(r.created_at).slice(0, 10),
    completedAt: r.completed_at ?? undefined,
  }),
  events: (r: Row): CalEvent => ({
    id: r.id, title: r.title, date: r.date, start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5),
    tone: r.tone, location: r.location ?? '', taskId: r.task_id ?? undefined,
  }),
  projects: (r: Row): Project => ({
    id: r.id, name: r.name, description: r.description ?? '', status: r.status, deadline: r.deadline ?? undefined, tone: r.tone,
  }),
  notes: (r: Row): Note => ({
    id: r.id, title: r.title ?? '', html: r.html ?? '', folder: r.folder, space: r.space ?? 'posao', tags: r.tags ?? [], pinned: r.pinned,
    projectId: r.project_id ?? undefined, updatedAt: r.updated_at,
  }),
  txns: (r: Row): Txn => ({
    id: r.id, type: r.type, amount: num(r.amount), category: r.category, date: r.date, description: r.description ?? '', recurring: r.recurring,
  }),
  goals: (r: Row): Goal => ({
    id: r.id, name: r.name, target: num(r.target), saved: num(r.saved), deadline: r.deadline ?? undefined, tone: r.tone,
  }),
  inbox: (r: Row): InboxItem => ({ id: r.id, text: r.text, kind: r.kind, createdAt: r.created_at }),
};

/* ───────── app → row (user_id is filled by the database default = auth.uid()) ───────── */
export const toRow: Record<CollectionKey, (x: any) => Row> = {
  tasks: (t: Task) => ({
    id: t.id, title: t.title, notes: t.notes ?? '', done: t.done, status: t.status, progress: Math.round(t.progress),
    waiting_for: t.status === 'ceka' ? t.waitingFor : '', start_date: n(t.start), priority: t.priority, due: n(t.due), category: t.category,
    project_id: n(t.projectId), subtasks: t.subtasks, recurring: n(t.recurring), today_focus: !!t.todayFocus, completed_at: n(t.completedAt),
  }),
  events: (e: CalEvent) => ({
    id: e.id, title: e.title, date: e.date, start_time: e.start, end_time: e.end, tone: e.tone, location: e.location ?? '', task_id: n(e.taskId),
  }),
  projects: (p: Project) => ({ id: p.id, name: p.name, description: p.description, status: p.status, deadline: n(p.deadline), tone: p.tone }),
  notes: (x: Note) => ({ id: x.id, title: x.title, html: x.html, folder: x.folder, space: x.space, tags: x.tags, pinned: x.pinned, project_id: x.space === 'privatno' ? null : n(x.projectId) }),
  txns: (t: Txn) => ({ id: t.id, type: t.type, amount: t.amount, category: t.category, date: t.date, description: t.description, recurring: t.recurring }),
  goals: (g: Goal) => ({ id: g.id, name: g.name, target: g.target, saved: g.saved, deadline: n(g.deadline), tone: g.tone }),
  inbox: (i: InboxItem) => ({ id: i.id, text: i.text, kind: i.kind }),
};

const check = <T,>(res: { data: T; error: { message: string } | null }) => {
  if (res.error) throw new Error(res.error.message);
  return res.data;
};

export async function fetchAll(): Promise<Omit<AppData, 'version'>> {
  const [tasks, events, projects, notes, txns, goals, inbox, budgets, settings] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('*').order('date'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('notes').select('*').order('updated_at', { ascending: false }),
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('goals').select('*').order('created_at'),
    supabase.from('inbox_items').select('*').order('created_at', { ascending: false }),
    supabase.from('budgets').select('*').order('category'),
    supabase.from('settings').select('*').maybeSingle(),
  ]);
  const s = check(settings) as Row | null;
  return {
    tasks: (check(tasks) as Row[]).map(fromRow.tasks),
    events: (check(events) as Row[]).map(fromRow.events),
    projects: (check(projects) as Row[]).map(fromRow.projects),
    notes: (check(notes) as Row[]).map(fromRow.notes),
    txns: (check(txns) as Row[]).map(fromRow.txns),
    goals: (check(goals) as Row[]).map(fromRow.goals),
    inbox: (check(inbox) as Row[]).map(fromRow.inbox),
    budgets: (check(budgets) as Row[]).map((b) => ({ category: b.category, limit: num(b.monthly_limit) })),
    settings: { name: s?.name ?? '', email: '', theme: s?.theme ?? 'svijetla', weekStartsMonday: true },
  };
}

export async function fetchCollection(key: CollectionKey) {
  const rows = check(await supabase.from(TABLE[key]).select('*')) as Row[];
  return rows.map((r) => (fromRow as any)[key](r));
}

export async function saveItem(key: CollectionKey, item: unknown) {
  check(await supabase.from(TABLE[key]).upsert(toRow[key](item)).select('id'));
}

export async function deleteItem(key: CollectionKey, id: string) {
  check(await supabase.from(TABLE[key]).delete().eq('id', id).select('id'));
}

export async function saveBudgets(budgets: Budget[]) {
  check(await supabase.from('budgets').upsert(budgets.map((b) => ({ category: b.category, monthly_limit: b.limit })), { onConflict: 'user_id,category' }));
}

export async function saveSettings(userId: string, s: Partial<SettingsData>) {
  const row: Row = { user_id: userId };
  if (s.name !== undefined) row.name = s.name;
  if (s.theme !== undefined) row.theme = s.theme;
  check(await supabase.from('settings').upsert(row));
}

export async function insertMany(key: CollectionKey, items: unknown[], ignoreDuplicates = false) {
  if (!items.length) return;
  check(await supabase.from(TABLE[key]).upsert(items.map(toRow[key]), { ignoreDuplicates }));
}

export async function deleteAllMine(userId: string) {
  // Order respects foreign keys.
  for (const t of ['events', 'notes', 'tasks', 'projects', 'transactions', 'goals', 'inbox_items', 'budgets']) {
    check(await supabase.from(t).delete().eq('user_id', userId));
  }
}

/** Deterministic UUID from a string (SHA-256), so two devices booking the same recurring item can't duplicate it. */
export async function stableUuid(input: string) {
  const buf = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))).slice(0, 16);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const h = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Translate common auth/database errors to Croatian. */
export function hrError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Pogrešna e-pošta ili lozinka.';
  if (m.includes('email not confirmed')) return 'E-pošta još nije potvrđena. Otvori poveznicu iz poruke koju smo poslali.';
  if (m.includes('user already registered')) return 'Račun s ovom e-poštom već postoji. Prijavi se.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Registracija novih računa je isključena.';
  if (m.includes('password should be') || m.includes('weak')) return 'Lozinka je preslaba. Koristi najmanje 8 znakova.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Previše pokušaja. Pričekaj nekoliko minuta pa pokušaj ponovno.';
  if (m.includes('not authorized') && m.includes('email')) return 'Slanje e-pošte na ovu adresu nije dopušteno postavkama poslužitelja.';
  if (m.includes('error sending')) return 'Poruku nije bilo moguće poslati. Pokušaj kasnije.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Nema veze s poslužiteljem. Provjeri internet.';
  if (m.includes('jwt') || m.includes('refresh token')) return 'Sesija je istekla. Prijavi se ponovno.';
  return msg;
}
