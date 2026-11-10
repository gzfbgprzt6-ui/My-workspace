import React, { createContext, useContext, useState } from 'react';
import { Plus, Trash2, Repeat } from 'lucide-react';
import type { CalEvent, Goal, Note, Priority, Project, ProjectStatus, Recurrence, Task, Tone, Txn } from './types';
import { useStore } from './store';
import { Button, Field, IconButton, Modal, inputCls, Segmented, ConfirmDialog } from './ui';
import { todayISO, uid, cx, TONE_BG, STATUS_LABEL } from './utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, NOTE_FOLDERS, TASK_CATEGORIES } from './data';

export type QuickKind = 'task' | 'event' | 'note' | 'txn' | 'project' | 'goal';
type Initial = Partial<Task> | Partial<CalEvent> | Partial<Note> | Partial<Txn> | Partial<Project> | Partial<Goal>;

interface QuickCtx {
  open: (kind: QuickKind, initial?: Initial) => void;
}
const Ctx = createContext<QuickCtx>({ open: () => {} });
export const useQuick = () => useContext(Ctx);

export function QuickProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ kind: QuickKind; initial?: Initial; key: number } | null>(null);
  const close = () => setState(null);
  const open = (kind: QuickKind, initial?: Initial) => setState({ kind, initial, key: Date.now() });
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state?.kind === 'task' && <TaskForm key={state.key} initial={state.initial as Partial<Task>} onClose={close} />}
      {state?.kind === 'event' && <EventForm key={state.key} initial={state.initial as Partial<CalEvent>} onClose={close} />}
      {state?.kind === 'note' && <NoteQuickForm key={state.key} initial={state.initial as Partial<Note>} onClose={close} />}
      {state?.kind === 'txn' && <TxnForm key={state.key} initial={state.initial as Partial<Txn>} onClose={close} />}
      {state?.kind === 'project' && <ProjectForm key={state.key} initial={state.initial as Partial<Project>} onClose={close} />}
      {state?.kind === 'goal' && <GoalForm key={state.key} initial={state.initial as Partial<Goal>} onClose={close} />}
    </Ctx.Provider>
  );
}

const TONES: Tone[] = ['lav', 'mint', 'peach', 'butter', 'sky'];
const TONE_NAME: Record<Tone, string> = { lav: 'Lavanda', mint: 'Menta', peach: 'Breskva', butter: 'Maslac', sky: 'Nebo' };

function TonePicker({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Boja">
      {TONES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          aria-label={TONE_NAME[t]}
          title={TONE_NAME[t]}
          onClick={() => onChange(t)}
          className={cx('w-8 h-8 rounded-full transition focus-ring', TONE_BG[t], value === t ? 'ring-2 ring-offset-2 ring-ink ring-offset-surface scale-110' : 'hover:scale-105')}
        />
      ))}
    </div>
  );
}

function FormFooter({ onClose, onSave, onDelete, canSave }: { onClose: () => void; onSave: () => void; onDelete?: () => void; canSave: boolean }) {
  return (
    <>
      {onDelete && (
        <Button variant="danger" className="mr-auto" onClick={onDelete}>
          <Trash2 size={15} /> Obriši
        </Button>
      )}
      <Button onClick={onClose}>Odustani</Button>
      <Button variant="primary" onClick={onSave} disabled={!canSave}>
        Spremi
      </Button>
    </>
  );
}

/* ───────────── Task ───────────── */
export function TaskForm({ initial, onClose }: { initial?: Partial<Task>; onClose: () => void }) {
  const { data, upsert, remove, toast } = useStore();
  const editing = Boolean(initial?.id);
  const [t, setT] = useState<Task>({
    id: initial?.id ?? uid(),
    title: initial?.title ?? '',
    notes: initial?.notes ?? '',
    done: initial?.done ?? false,
    priority: initial?.priority ?? 'srednji',
    due: initial?.due ?? todayISO(),
    category: initial?.category ?? 'Posao',
    projectId: initial?.projectId,
    subtasks: initial?.subtasks ?? [],
    recurring: initial?.recurring ?? null,
    todayFocus: initial?.todayFocus ?? false,
    createdAt: initial?.createdAt ?? todayISO(),
    completedAt: initial?.completedAt,
  });
  const [newSub, setNewSub] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }));

  const save = () => {
    upsert('tasks', { ...t, title: t.title.trim() });
    toast(editing ? 'Zadatak je ažuriran' : 'Zadatak je dodan');
    onClose();
  };
  const addSub = () => {
    if (!newSub.trim()) return;
    set('subtasks', [...t.subtasks, { id: uid(), title: newSub.trim(), done: false }]);
    setNewSub('');
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Uredi zadatak' : 'Novi zadatak'} footer={<FormFooter onClose={onClose} onSave={save} canSave={!!t.title.trim()} onDelete={editing ? () => setConfirm(true) : undefined} />}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Naziv" htmlFor="task-title">
          <input id="task-title" autoFocus className={inputCls} value={t.title} onChange={(e) => set('title', e.target.value)} placeholder="Što treba napraviti?" onKeyDown={(e) => e.key === 'Enter' && t.title.trim() && save()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rok" htmlFor="task-due">
            <input id="task-due" type="date" className={inputCls} value={t.due ?? ''} onChange={(e) => set('due', e.target.value || undefined)} />
          </Field>
          <Field label="Kategorija" htmlFor="task-cat">
            <select id="task-cat" className={inputCls} value={t.category} onChange={(e) => set('category', e.target.value)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Prioritet" htmlFor="task-prio">
          <div id="task-prio">
            <Segmented<Priority>
              label="Prioritet"
              value={t.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 'visok', label: 'Visok' },
                { value: 'srednji', label: 'Srednji' },
                { value: 'nizak', label: 'Nizak' },
              ]}
            />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Projekt" htmlFor="task-project">
            <select id="task-project" className={inputCls} value={t.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || undefined)}>
              <option value="">Bez projekta</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ponavljanje" htmlFor="task-rec">
            <select id="task-rec" className={inputCls} value={t.recurring ?? ''} onChange={(e) => set('recurring', (e.target.value || null) as Recurrence)}>
              <option value="">Ne ponavlja se</option>
              <option value="dnevno">Svaki dan</option>
              <option value="tjedno">Svaki tjedan</option>
              <option value="mjesečno">Svaki mjesec</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
          <input type="checkbox" id="task-focus" className="w-4 h-4 accent-[#6DD3B2]" checked={!!t.todayFocus} onChange={(e) => set('todayFocus', e.target.checked)} />
          Označi kao prioritet za danas
        </label>
        <Field label="Podzadaci" htmlFor="task-sub">
          <div className="grid grid-cols-1 gap-1.5">
            {t.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-surface2 rounded-xl pl-3 pr-1 h-10">
                <input type="checkbox" aria-label={`Završeno: ${s.title}`} className="w-4 h-4 accent-[#6DD3B2]" checked={s.done} onChange={() => set('subtasks', t.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} />
                <span className={cx('flex-1 text-sm', s.done && 'line-through text-muted')}>{s.title}</span>
                <IconButton label="Ukloni podzadatak" onClick={() => set('subtasks', t.subtasks.filter((x) => x.id !== s.id))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
            <div className="flex gap-2">
              <input id="task-sub" className={inputCls} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Dodaj podzadatak" onKeyDown={(e) => e.key === 'Enter' && addSub()} />
              <Button onClick={addSub} aria-label="Dodaj podzadatak">
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </Field>
        <Field label="Bilješke" htmlFor="task-notes">
          <textarea id="task-notes" rows={2} className={cx(inputCls, 'h-auto py-2.5 resize-none')} value={t.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Dodatni detalji" />
        </Field>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Obrisati zadatak?" text={`„${t.title}" bit će trajno uklonjen.`} onConfirm={() => { remove('tasks', t.id); toast('Zadatak je obrisan'); onClose(); }} />
    </Modal>
  );
}

/* ───────────── Event ───────────── */
export function EventForm({ initial, onClose }: { initial?: Partial<CalEvent>; onClose: () => void }) {
  const { data, upsert, remove, toast } = useStore();
  const editing = Boolean(initial?.id);
  const [e, setE] = useState<CalEvent>({
    id: initial?.id ?? uid(),
    title: initial?.title ?? '',
    date: initial?.date ?? todayISO(),
    start: initial?.start ?? '10:00',
    end: initial?.end ?? '11:00',
    tone: initial?.tone ?? 'sky',
    location: initial?.location ?? '',
    taskId: initial?.taskId,
  });
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setE((x) => ({ ...x, [k]: v }));
  const valid = e.title.trim() && e.end > e.start;
  const save = () => {
    upsert('events', { ...e, title: e.title.trim() });
    toast(editing ? 'Događaj je ažuriran' : 'Događaj je dodan u kalendar');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={editing ? 'Uredi događaj' : 'Novi događaj'} footer={<FormFooter onClose={onClose} onSave={save} canSave={!!valid} onDelete={editing ? () => { remove('events', e.id); toast('Događaj je obrisan'); onClose(); } : undefined} />}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Naziv" htmlFor="ev-title">
          <input id="ev-title" autoFocus className={inputCls} value={e.title} onChange={(x) => set('title', x.target.value)} placeholder="npr. Sastanak s klijentom" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Datum" htmlFor="ev-date">
            <input id="ev-date" type="date" className={inputCls} value={e.date} onChange={(x) => set('date', x.target.value)} />
          </Field>
          <Field label="Početak" htmlFor="ev-start">
            <input id="ev-start" type="time" className={inputCls} value={e.start} onChange={(x) => set('start', x.target.value)} />
          </Field>
          <Field label="Kraj" htmlFor="ev-end">
            <input id="ev-end" type="time" className={inputCls} value={e.end} onChange={(x) => set('end', x.target.value)} />
          </Field>
        </div>
        {e.end <= e.start && <p className="text-xs text-peach-ink -mt-2">Kraj mora biti nakon početka.</p>}
        <Field label="Lokacija" htmlFor="ev-loc">
          <input id="ev-loc" className={inputCls} value={e.location} onChange={(x) => set('location', x.target.value)} placeholder="Adresa ili poveznica" />
        </Field>
        <Field label="Povezani zadatak" htmlFor="ev-task">
          <select id="ev-task" className={inputCls} value={e.taskId ?? ''} onChange={(x) => set('taskId', x.target.value || undefined)}>
            <option value="">Nema</option>
            {data.tasks.filter((t) => !t.done).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Boja" htmlFor="ev-tone">
          <TonePicker value={e.tone} onChange={(v) => set('tone', v)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Note (quick capture) ───────────── */
function NoteQuickForm({ initial, onClose }: { initial?: Partial<Note>; onClose: () => void }) {
  const { upsert, toast } = useStore();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState('');
  const [folder, setFolder] = useState(initial?.folder ?? 'Osobno');
  const save = () => {
    const html = body
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/</g, '&lt;')}</p>`)
      .join('');
    upsert('notes', { id: uid(), title: title.trim() || 'Bez naslova', html, folder, tags: [], pinned: false, projectId: initial?.projectId, updatedAt: new Date().toISOString() });
    toast('Bilješka je spremljena');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Nova bilješka" footer={<FormFooter onClose={onClose} onSave={save} canSave={!!(title.trim() || body.trim())} />}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Naslov" htmlFor="nq-title">
          <input id="nq-title" autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Sadržaj" htmlFor="nq-body" hint="Oblikovanje (podebljano, popisi) dostupno je u modulu Bilješke.">
          <textarea id="nq-body" rows={5} className={cx(inputCls, 'h-auto py-2.5 resize-none')} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Mapa" htmlFor="nq-folder">
          <select id="nq-folder" className={inputCls} value={folder} onChange={(e) => setFolder(e.target.value)}>
            {NOTE_FOLDERS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Transaction ───────────── */
export function TxnForm({ initial, onClose }: { initial?: Partial<Txn>; onClose: () => void }) {
  const { upsert, remove, toast } = useStore();
  const editing = Boolean(initial?.id);
  const [x, setX] = useState<Txn>({
    id: initial?.id ?? uid(),
    type: initial?.type ?? 'rashod',
    amount: initial?.amount ?? 0,
    category: initial?.category ?? 'Hrana',
    date: initial?.date ?? todayISO(),
    description: initial?.description ?? '',
    recurring: initial?.recurring ?? false,
  });
  const [amountStr, setAmountStr] = useState(initial?.amount ? String(initial.amount).replace('.', ',') : '');
  const set = <K extends keyof Txn>(k: K, v: Txn[K]) => setX((p) => ({ ...p, [k]: v }));
  const amount = Number(amountStr.replace(/\./g, '').replace(',', '.'));
  const valid = amount > 0 && Number.isFinite(amount);
  const cats = x.type === 'rashod' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const save = () => {
    upsert('txns', { ...x, amount: Math.round(amount * 100) / 100, description: x.description.trim() || x.category });
    toast(editing ? 'Transakcija je ažurirana' : x.type === 'rashod' ? 'Trošak je dodan' : 'Prihod je dodan');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={editing ? 'Uredi transakciju' : 'Nova transakcija'} footer={<FormFooter onClose={onClose} onSave={save} canSave={valid} onDelete={editing ? () => { remove('txns', x.id); toast('Transakcija je obrisana'); onClose(); } : undefined} />}>
      <div className="grid grid-cols-1 gap-4">
        <Segmented<Txn['type']>
          label="Vrsta"
          value={x.type}
          onChange={(v) => setX((p) => ({ ...p, type: v, category: v === 'rashod' ? 'Hrana' : 'Plaća' }))}
          options={[
            { value: 'rashod', label: 'Trošak' },
            { value: 'prihod', label: 'Prihod' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Iznos (€)" htmlFor="tx-amount">
            <input id="tx-amount" autoFocus inputMode="decimal" className={cx(inputCls, 'tabular-nums')} value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Datum" htmlFor="tx-date">
            <input id="tx-date" type="date" className={inputCls} value={x.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <Field label="Kategorija" htmlFor="tx-cat">
          <select id="tx-cat" className={inputCls} value={x.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Opis" htmlFor="tx-desc">
          <input id="tx-desc" className={inputCls} value={x.description} onChange={(e) => set('description', e.target.value)} placeholder="npr. Konzum — tjedna kupovina" />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
          <input type="checkbox" id="tx-rec" className="w-4 h-4 accent-[#FFB59E]" checked={x.recurring} onChange={(e) => set('recurring', e.target.checked)} />
          <Repeat size={14} className="text-muted" /> Ponavlja se svaki mjesec
        </label>
      </div>
    </Modal>
  );
}

/* ───────────── Project ───────────── */
export function ProjectForm({ initial, onClose }: { initial?: Partial<Project>; onClose: () => void }) {
  const { upsert, remove, toast } = useStore();
  const editing = Boolean(initial?.id);
  const [p, setP] = useState<Project>({
    id: initial?.id ?? uid(),
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'planirano',
    deadline: initial?.deadline,
    tone: initial?.tone ?? 'lav',
  });
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = () => {
    upsert('projects', { ...p, name: p.name.trim() });
    toast(editing ? 'Projekt je ažuriran' : 'Projekt je kreiran');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={editing ? 'Uredi projekt' : 'Novi projekt'} footer={<FormFooter onClose={onClose} onSave={save} canSave={!!p.name.trim()} onDelete={editing ? () => { remove('projects', p.id); toast('Projekt je obrisan'); onClose(); } : undefined} />}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Naziv" htmlFor="pr-name">
          <input id="pr-name" autoFocus className={inputCls} value={p.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Opis" htmlFor="pr-desc">
          <textarea id="pr-desc" rows={3} className={cx(inputCls, 'h-auto py-2.5 resize-none')} value={p.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="pr-status">
            <select id="pr-status" className={inputCls} value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
              {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rok" htmlFor="pr-deadline">
            <input id="pr-deadline" type="date" className={inputCls} value={p.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || undefined)} />
          </Field>
        </div>
        <Field label="Boja" htmlFor="pr-tone">
          <TonePicker value={p.tone} onChange={(v) => set('tone', v)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────────── Savings goal ───────────── */
export function GoalForm({ initial, onClose }: { initial?: Partial<Goal>; onClose: () => void }) {
  const { upsert, remove, toast } = useStore();
  const editing = Boolean(initial?.id);
  const [g, setG] = useState<Goal>({ id: initial?.id ?? uid(), name: initial?.name ?? '', target: initial?.target ?? 1000, saved: initial?.saved ?? 0, deadline: initial?.deadline, tone: initial?.tone ?? 'mint' });
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setG((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={editing ? 'Uredi cilj štednje' : 'Novi cilj štednje'} footer={<FormFooter onClose={onClose} onSave={() => { upsert('goals', g); toast('Cilj je spremljen'); onClose(); }} canSave={!!g.name.trim() && g.target > 0} onDelete={editing ? () => { remove('goals', g.id); onClose(); } : undefined} />}>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Naziv" htmlFor="gl-name">
          <input id="gl-name" autoFocus className={inputCls} value={g.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cilj (€)" htmlFor="gl-target">
            <input id="gl-target" type="number" min={0} className={inputCls} value={g.target} onChange={(e) => set('target', Number(e.target.value))} />
          </Field>
          <Field label="Ušteđeno (€)" htmlFor="gl-saved">
            <input id="gl-saved" type="number" min={0} className={inputCls} value={g.saved} onChange={(e) => set('saved', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Rok" htmlFor="gl-deadline">
          <input id="gl-deadline" type="date" className={inputCls} value={g.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || undefined)} />
        </Field>
        <Field label="Boja" htmlFor="gl-tone">
          <TonePicker value={g.tone} onChange={(v) => set('tone', v)} />
        </Field>
      </div>
    </Modal>
  );
}
