import type { AppData, Txn } from './types';
import { addDays, addMonths, todayISO, toISO, fromISO } from './utils';

/** Realistic sample content, dated relative to today so the prototype always looks current. */
export function buildSampleData(): AppData {
  const t = todayISO();
  const d = (n: number) => addDays(t, n);
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * 3600000).toISOString();

  const projects: AppData['projects'] = [
    { id: 'p1', name: 'Redizajn web stranice', description: 'Nova stranica za Odmoria s vodičima za goste i cjenikom.', status: 'u-tijeku', deadline: d(24), tone: 'lav' },
    { id: 'p2', name: 'Godišnje zatvaranje knjiga', description: 'Usklađivanje uplata partnera i priprema za reviziju.', status: 'u-tijeku', deadline: d(38), tone: 'peach' },
    { id: 'p3', name: 'Preseljenje ureda', description: 'Odabir lokacije, ugovor i logistika selidbe.', status: 'planirano', deadline: d(70), tone: 'sky' },
    { id: 'p4', name: 'Tečaj talijanskog', description: 'Razina B1 do proljeća, dvije lekcije tjedno.', status: 'na-cekanju', tone: 'mint' },
    { id: 'p5', name: 'Sezonska kampanja', description: 'Ljetna promocija za iznajmljivače.', status: 'zavrseno', deadline: d(-20), tone: 'butter' },
  ];

  const tasks: AppData['tasks'] = [
    { id: 't1', title: 'Pripremiti prijedlog cjenika za Odmoria', done: false, priority: 'visok', due: t, category: 'Posao', projectId: 'p1', recurring: null, todayFocus: true, createdAt: d(-5),
      subtasks: [ { id: 's1', title: 'Usporediti konkurenciju', done: true }, { id: 's2', title: 'Izračunati tri paketa', done: false }, { id: 's3', title: 'Poslati na pregled', done: false } ] },
    { id: 't2', title: 'Uskladiti uplate partnera za listopad', done: false, priority: 'visok', due: t, category: 'Financije', projectId: 'p2', recurring: 'mjesečno', todayFocus: true, createdAt: d(-3), subtasks: [] },
    { id: 't3', title: 'Nazvati agenta za uredski prostor', done: false, priority: 'srednji', due: t, category: 'Posao', projectId: 'p3', recurring: null, todayFocus: true, createdAt: d(-2), subtasks: [] },
    { id: 't4', title: 'Tjedni pregled', done: false, priority: 'srednji', due: d(4), category: 'Osobno', recurring: 'tjedno', createdAt: d(-10), subtasks: [] },
    { id: 't5', title: 'Napisati tekst za početnu stranicu', done: false, priority: 'srednji', due: d(2), category: 'Posao', projectId: 'p1', recurring: null, createdAt: d(-4), subtasks: [ { id: 's4', title: 'Naslov i podnaslov', done: true }, { id: 's5', title: 'Sekcija s cijenama', done: false } ] },
    { id: 't6', title: 'Platiti račun za struju', done: false, priority: 'visok', due: d(1), category: 'Kućanstvo', recurring: 'mjesečno', createdAt: d(-6), subtasks: [] },
    { id: 't7', title: 'Poslati izvod knjigovođi', done: false, priority: 'srednji', due: d(-1), category: 'Financije', projectId: 'p2', recurring: null, createdAt: d(-8), subtasks: [] },
    { id: 't8', title: 'Lekcija talijanskog — poglavlje 6', done: false, priority: 'nizak', due: d(3), category: 'Učenje', projectId: 'p4', recurring: 'tjedno', createdAt: d(-7), subtasks: [] },
    { id: 't9', title: 'Wireframe stranice s vodičima', done: true, priority: 'visok', due: d(-2), category: 'Posao', projectId: 'p1', recurring: null, createdAt: d(-9), completedAt: d(-2), subtasks: [] },
    { id: 't10', title: 'Odabrati paletu boja', done: true, priority: 'srednji', due: d(-3), category: 'Posao', projectId: 'p1', recurring: null, createdAt: d(-9), completedAt: d(-3), subtasks: [] },
    { id: 't11', title: 'Izvesti popis dugovanja', done: true, priority: 'visok', due: d(-1), category: 'Financije', projectId: 'p2', recurring: null, createdAt: d(-6), completedAt: d(-1), subtasks: [] },
    { id: 't12', title: 'Rezervirati servis auta', done: true, priority: 'nizak', due: d(-4), category: 'Osobno', recurring: null, createdAt: d(-12), completedAt: d(-4), subtasks: [] },
    { id: 't13', title: 'Popis zahtjeva za novi ured', done: false, priority: 'nizak', due: d(9), category: 'Posao', projectId: 'p3', recurring: null, createdAt: d(-1), subtasks: [] },
    { id: 't14', title: 'Kupiti poklon za mamin rođendan', done: false, priority: 'srednji', due: d(6), category: 'Osobno', recurring: null, createdAt: d(-1), subtasks: [] },
    { id: 't15', title: 'Pregledati izvješće o reviziji', done: true, priority: 'srednji', due: d(0), category: 'Financije', projectId: 'p2', recurring: null, createdAt: d(-3), completedAt: d(0), subtasks: [] },
    { id: 't16', title: 'Objaviti sažetak kampanje', done: true, priority: 'nizak', due: d(-21), category: 'Posao', projectId: 'p5', recurring: null, createdAt: d(-30), completedAt: d(-21), subtasks: [] },
  ];

  const events: AppData['events'] = [
    { id: 'e1', title: 'Stand-up s timom', date: t, start: '09:30', end: '09:45', tone: 'sky', location: 'Google Meet' },
    { id: 'e2', title: 'Ručak s Anom', date: t, start: '12:30', end: '13:30', tone: 'peach', location: 'Bistro Tkalča' },
    { id: 'e3', title: 'Pregled dizajna stranice', date: t, start: '15:00', end: '16:00', tone: 'lav', location: 'Ured' },
    { id: 'e4', title: 'Sastanak s knjigovođom', date: d(1), start: '10:00', end: '11:00', tone: 'peach', location: 'Ilica 42' },
    { id: 'e5', title: 'Teretana', date: d(1), start: '18:00', end: '19:00', tone: 'mint' },
    { id: 'e6', title: 'Razgledavanje ureda', date: d(2), start: '11:00', end: '12:00', tone: 'sky', location: 'Radnička cesta' },
    { id: 'e7', title: 'Talijanski — lekcija', date: d(3), start: '19:00', end: '20:00', tone: 'mint', location: 'Online' },
    { id: 'e8', title: 'Obiteljska večera', date: d(5), start: '19:30', end: '22:00', tone: 'butter' },
    { id: 'e9', title: 'Demo za klijenta', date: d(7), start: '14:00', end: '15:00', tone: 'lav', location: 'Zoom' },
    { id: 'e10', title: 'Zubar', date: d(9), start: '08:30', end: '09:15', tone: 'sky' },
    { id: 'e11', title: 'Planiranje kvartala', date: d(-2), start: '10:00', end: '12:00', tone: 'lav' },
  ];

  const notes: AppData['notes'] = [
    { id: 'n1', title: 'Ideje za cjenik', folder: 'Posao', tags: ['odmoria', 'cijene'], pinned: true, projectId: 'p1', updatedAt: ago(1.5),
      html: '<h2>Tri paketa</h2><ul><li><b>Osnovni</b> — jedan objekt, digitalni vodič</li><li><b>Pro</b> — do 5 objekata, prijevodi</li><li><b>Agencija</b> — neograničeno, brendiranje</li></ul><p>Provjeriti cijene konkurencije prije petka.</p>' },
    { id: 'n2', title: 'Kontrolna lista za reviziju', folder: 'Financije', tags: ['revizija'], pinned: true, projectId: 'p2', updatedAt: ago(20),
      html: '<p>Prije slanja revizoru:</p><ol><li>Izvodi za sve račune</li><li>Popis otvorenih potraživanja</li><li>Otplatni planovi partnera</li></ol>' },
    { id: 'n3', title: 'Zahtjevi za novi ured', folder: 'Posao', tags: ['ured'], pinned: false, projectId: 'p3', updatedAt: ago(30),
      html: '<p>Najmanje 60 m², parking, blizu tramvaja. Proračun do <b>1.400 €</b> mjesečno.</p>' },
    { id: 'n4', title: 'Knjige za pročitati', folder: 'Osobno', tags: ['čitanje'], pinned: false, updatedAt: ago(52),
      html: '<ul><li>Deep Work</li><li>The Psychology of Money</li><li>Atomic Habits (ponovno)</li></ul>' },
    { id: 'n5', title: 'Talijanski — fraze', folder: 'Učenje', tags: ['talijanski'], pinned: false, projectId: 'p4', updatedAt: ago(75),
      html: '<p><i>Che ne pensi?</i> — Što misliš o tome?</p><p><i>Magari!</i> — Da barem!</p>' },
  ];

  // Six months of transactions so the charts have real shape.
  const txns: Txn[] = [];
  const firstOfMonth = (offset: number) => {
    const dt = fromISO(t);
    dt.setDate(1);
    dt.setMonth(dt.getMonth() + offset);
    return toISO(dt);
  };
  const seq = [1.0, 0.92, 1.08, 0.97, 1.12, 0.89];
  for (let m = -5; m <= 0; m++) {
    const f = firstOfMonth(m);
    const k = seq[m + 5];
    const inMonth = (day: number) => {
      const iso = addDays(f, day - 1);
      return m === 0 && iso > t ? null : iso;
    };
    const push = (day: number, type: Txn['type'], amount: number, category: string, description: string, recurring = false) => {
      const date = inMonth(day);
      if (date) txns.push({ id: `x${txns.length + 1}`, type, amount: Math.round(amount * 100) / 100, category, date, description, recurring });
    };
    push(1, 'prihod', 2450, 'Plaća', 'Mjesečna plaća', true);
    push(3, 'rashod', 650, 'Stanovanje', 'Najam stana', true);
    push(15, 'prihod', 380 * k, 'Honorar', 'Freelance projekt');
    push(4, 'rashod', 92.4 * k, 'Hrana', 'Konzum — tjedna kupovina');
    push(11, 'rashod', 78.9 * k, 'Hrana', 'Plodine');
    push(18, 'rashod', 64.3 * k, 'Hrana', 'Tržnica Dolac');
    push(6, 'rashod', 45 * k, 'Prijevoz', 'Gorivo');
    push(8, 'rashod', 39.99, 'Pretplate', 'Softverske pretplate', true);
    push(9, 'rashod', 58.6 * k, 'Režije', 'HEP — struja', true);
    push(10, 'rashod', 72 * k, 'Izlasci', 'Večera s prijateljima');
    push(12, 'rashod', 120 * k, 'Kupovina', 'Odjeća');
    push(5, 'rashod', 30, 'Zdravlje', 'Teretana — članarina', true);
    push(2, 'rashod', 200, 'Štednja', 'Prijenos na štedni račun', true);
  }
  txns.sort((a, b) => b.date.localeCompare(a.date));

  return {
    version: 1,
    projects,
    tasks,
    events,
    notes,
    txns,
    budgets: [
      { category: 'Hrana', limit: 320 },
      { category: 'Izlasci', limit: 120 },
      { category: 'Kupovina', limit: 150 },
      { category: 'Prijevoz', limit: 80 },
      { category: 'Režije', limit: 110 },
    ],
    goals: [
      { id: 'g1', name: 'Fond za hitne slučajeve', target: 6000, saved: 3850, tone: 'mint' },
      { id: 'g2', name: 'Putovanje u Japan', target: 3500, saved: 1240, deadline: addMonths(t, 8), tone: 'lav' },
      { id: 'g3', name: 'Novi laptop', target: 1800, saved: 1520, deadline: addMonths(t, 2), tone: 'sky' },
    ],
    inbox: [
      { id: 'i1', text: 'Dodati FAQ sekciju na stranicu s vodičima', kind: 'ideja', createdAt: ago(2) },
      { id: 'i2', text: 'Provjeriti ponudu za osiguranje stana', kind: 'zadatak', createdAt: ago(5) },
      { id: 'i3', text: 'Citat za prezentaciju: „Jednostavnost je krajnja sofisticiranost."', kind: 'bilješka', createdAt: ago(26) },
      { id: 'i4', text: 'Pitati Marka za preporuku računovođe u Splitu', kind: 'zadatak', createdAt: ago(49) },
    ],
    settings: { name: 'Luka', email: 'ime@primjer.hr', theme: 'svijetla', weekStartsMonday: true },
  };
}

export const TASK_CATEGORIES = ['Posao', 'Financije', 'Osobno', 'Kućanstvo', 'Učenje', 'Zdravlje'];
export const EXPENSE_CATEGORIES = ['Hrana', 'Stanovanje', 'Režije', 'Prijevoz', 'Izlasci', 'Kupovina', 'Pretplate', 'Zdravlje', 'Štednja', 'Ostalo'];
export const INCOME_CATEGORIES = ['Plaća', 'Honorar', 'Povrat', 'Ostalo'];
export const NOTE_FOLDERS = ['Posao', 'Financije', 'Osobno', 'Učenje'];
