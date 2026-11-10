import type { Priority, ProjectStatus, Task, Tone } from './types';

export const uid = (): string => {
  const c = globalThis.crypto as Crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x: number) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date → YYYY-MM-DD (no timezone shift). */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const addMonths = (iso: string, n: number) => {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
};
export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);

/** European format DD.MM.YYYY */
export const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
export const fmtShort = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
};
export const fmtDateTime = (isoDT: string) => {
  const d = new Date(isoDT);
  return `${fmtDate(toISO(d))} u ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const DAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
export const DAYS_SHORT = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
export const MONTHS = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
];
export const MONTHS_SHORT = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro'];

export const weekdayName = (iso: string) => DAYS[fromISO(iso).getDay()];

export const startOfWeek = (iso: string) => {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
};

const eurFmt = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });
const eurFmt0 = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const eur = (n: number) => eurFmt.format(n);
export const eur0 = (n: number) => eurFmt0.format(n);

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Dobro jutro';
  if (h < 18) return 'Dobar dan';
  return 'Dobra večer';
};

export const relativeDue = (iso: string) => {
  const d = diffDays(iso, todayISO());
  if (d === 0) return 'Danas';
  if (d === 1) return 'Sutra';
  if (d === -1) return 'Jučer';
  if (d < 0) return `Kasni ${-d} d`;
  if (d < 7) return weekdayName(iso);
  return fmtDate(iso);
};

export const PRIORITY_LABEL: Record<Priority, string> = { visok: 'Visok', srednji: 'Srednji', nizak: 'Nizak' };
export const PRIORITY_RANK: Record<Priority, number> = { visok: 0, srednji: 1, nizak: 2 };

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planirano: 'Planirano',
  'u-tijeku': 'U tijeku',
  'na-cekanju': 'Na čekanju',
  zavrseno: 'Završeno',
};

export const TONE_BG: Record<Tone, string> = {
  lav: 'bg-lav', mint: 'bg-mint', peach: 'bg-peach', butter: 'bg-butter', sky: 'bg-sky',
};
export const TONE_SOFT: Record<Tone, string> = {
  lav: 'bg-lav/15', mint: 'bg-mint/20', peach: 'bg-peach/20', butter: 'bg-butter/25', sky: 'bg-sky/25',
};
export const TONE_INK: Record<Tone, string> = {
  lav: 'text-lav-ink', mint: 'text-mint-ink', peach: 'text-peach-ink', butter: 'text-butter-ink', sky: 'text-sky-ink',
};
export const TONE_HEX: Record<Tone, string> = {
  lav: '#A78BFA', mint: '#6DD3B2', peach: '#FFB59E', butter: '#F5D67B', sky: '#A5C7F7',
};

export const taskProgress = (t: Task) =>
  t.done ? 100 : t.subtasks.length ? Math.round((t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100) : Math.max(0, Math.min(100, t.progress ?? 0));

export const projectProgress = (projectId: string, tasks: Task[]) => {
  const t = tasks.filter((x) => x.projectId === projectId);
  if (!t.length) return 0;
  return Math.round((t.filter((x) => x.done).length / t.length) * 100);
};

export const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, (m) => m + ' ');
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
