import React, { useMemo, useState } from 'react';
import { Plus, Search, SquareCheck, List, Columns3, Hourglass, Flag } from 'lucide-react';
import { useStore } from '../store';
import { useQuick, STATUS_META } from '../forms';
import { Button, Card, Chip, Empty, PageHeader, Segmented, inputCls } from '../ui';
import { TaskRow, dueLabel } from '../TaskRow';
import { TASK_CATEGORIES } from '../data';
import type { Priority, Task, TaskStatus } from '../types';
import { PRIORITY_RANK, addDays, cx, taskProgress, todayISO } from '../utils';

type View = 'sve' | 'danas' | 'ceka' | 'nadolazece' | 'zavrseno';
type Layout = 'popis' | 'ploca';
type Column = TaskStatus | 'gotovo';

const COLUMNS: { id: Column; label: string; tone: 'sky' | 'lav' | 'butter' | 'mint' }[] = [
  { id: 'otvoreno', label: 'Otvoreno', tone: 'sky' },
  { id: 'u-tijeku', label: 'U tijeku', tone: 'lav' },
  { id: 'ceka', label: 'Čeka se', tone: 'butter' },
  { id: 'gotovo', label: 'Završeno', tone: 'mint' },
];

export function Tasks() {
  const { data, upsert, toggleTask, toast } = useStore();
  const { open } = useQuick();
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      return (localStorage.getItem('mw-task-layout') as Layout) || 'popis';
    } catch {
      return 'popis';
    }
  });
  const [view, setView] = useState<View>('sve');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [prio, setPrio] = useState<'' | Priority>('');
  const [project, setProject] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Column | null>(null);
  const today = todayISO();

  const changeLayout = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem('mw-task-layout', l);
    } catch {
      /* ignore */
    }
  };

  const categories = useMemo(() => Array.from(new Set([...TASK_CATEGORIES, ...data.tasks.map((t) => t.category)])), [data.tasks]);

  /** Filters shared by both layouts (search, category, priority, project). */
  const base = useMemo(() => {
    let list = data.tasks;
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(s) || t.notes?.toLowerCase().includes(s) || t.waitingFor.toLowerCase().includes(s));
    }
    if (cat) list = list.filter((t) => t.category === cat);
    if (prio) list = list.filter((t) => t.priority === prio);
    if (project) list = list.filter((t) => (project === '-' ? !t.projectId : t.projectId === project));
    return list;
  }, [data.tasks, q, cat, prio, project]);

  const sortFn = (a: Task, b: Task) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

  const groups = useMemo(() => {
    let list = view === 'zavrseno' ? base.filter((t) => t.done) : base.filter((t) => !t.done);
    if (view === 'danas') list = list.filter((t) => (t.due && t.due <= today) || t.todayFocus);
    if (view === 'ceka') list = list.filter((t) => t.status === 'ceka');
    if (view === 'nadolazece') list = list.filter((t) => t.due && t.due > today);
    list = [...list].sort(sortFn);
    if (view === 'zavrseno') return [{ title: 'Završeno', items: [...list].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')) }];
    if (view === 'ceka') return [{ title: 'Čeka se', items: list }];
    const g: { title: string; items: Task[] }[] = [
      { title: 'Kasni', items: [] },
      { title: 'Danas', items: [] },
      { title: 'Čeka se', items: [] },
      { title: 'Sljedećih 7 dana', items: [] },
      { title: 'Kasnije', items: [] },
      { title: 'Bez roka', items: [] },
    ];
    const week = addDays(today, 7);
    for (const t of list) {
      if (t.due && t.due < today) g[0].items.push(t);
      else if (t.due === today) g[1].items.push(t);
      else if (t.status === 'ceka') g[2].items.push(t);
      else if (!t.due) g[5].items.push(t);
      else if (t.due <= week) g[3].items.push(t);
      else g[4].items.push(t);
    }
    return g.filter((x) => x.items.length);
  }, [base, view, today]);

  const board = useMemo(() => {
    const cols: Record<Column, Task[]> = { otvoreno: [], 'u-tijeku': [], ceka: [], gotovo: [] };
    for (const t of base) {
      if (t.done) {
        if (t.completedAt && t.completedAt >= addDays(today, -14)) cols.gotovo.push(t);
      } else cols[t.status].push(t);
    }
    (Object.keys(cols) as Column[]).forEach((k) => cols[k].sort(k === 'gotovo' ? (a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '') : sortFn));
    return cols;
  }, [base, today]);

  const moveTo = (t: Task, col: Column) => {
    if (col === 'gotovo') {
      if (!t.done) {
        toggleTask(t.id);
        toast('Zadatak je završen');
      }
      return;
    }
    if (t.done) {
      upsert('tasks', { ...t, done: false, completedAt: undefined, status: col, progress: t.progress === 100 ? 90 : t.progress });
      toast(`Vraćeno → ${STATUS_META[col].label}`);
      return;
    }
    if (t.status === col) return;
    upsert('tasks', { ...t, status: col, progress: col === 'u-tijeku' && t.progress === 0 && !t.subtasks.length ? 10 : t.progress });
    toast(`→ ${STATUS_META[col].label}`);
  };

  const openCount = data.tasks.filter((t) => !t.done).length;
  const waitingCount = data.tasks.filter((t) => !t.done && t.status === 'ceka').length;
  const activeFilters = [cat, prio, project, q].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        tone="mint"
        title="Zadaci"
        subtitle={`${openCount} otvorenih · ${data.tasks.filter((t) => !t.done && t.status === 'u-tijeku').length} u tijeku · ${waitingCount} čeka`}
        actions={
          <>
            <Segmented<Layout>
              label="Prikaz"
              value={layout}
              onChange={changeLayout}
              options={[
                { value: 'popis', label: 'Popis', icon: <List size={14} /> },
                { value: 'ploca', label: 'Ploča', icon: <Columns3 size={14} /> },
              ]}
            />
            <Button variant="primary" onClick={() => open('task')}>
              <Plus size={16} /> Novi zadatak
            </Button>
          </>
        }
      />
      <Card className="mb-4 !p-3 md:!p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {layout === 'popis' && (
            <div className="overflow-x-auto -mx-1 px-1">
              <Segmented<View>
                label="Filtar"
                value={view}
                onChange={setView}
                options={[
                  { value: 'sve', label: 'Sve otvoreno' },
                  { value: 'danas', label: 'Danas' },
                  { value: 'ceka', label: `Čeka se${waitingCount ? ` (${waitingCount})` : ''}` },
                  { value: 'nadolazece', label: 'Nadolazeće' },
                  { value: 'zavrseno', label: 'Završeno' },
                ]}
              />
            </div>
          )}
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="task-search" aria-label="Pretraži zadatke" className={cx(inputCls, 'pl-9')} placeholder="Pretraži naziv, bilješke, čekanja" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            <select id="f-cat" aria-label="Kategorija" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Kategorija</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select id="f-prio" aria-label="Prioritet" className={inputCls} value={prio} onChange={(e) => setPrio(e.target.value as '' | Priority)}>
              <option value="">Prioritet</option>
              <option value="visok">Visok</option>
              <option value="srednji">Srednji</option>
              <option value="nizak">Nizak</option>
            </select>
            <select id="f-proj" aria-label="Projekt" className={inputCls} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Projekt</option>
              <option value="-">Bez projekta</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {activeFilters > 0 && (
          <button type="button" className="mt-2 text-xs text-muted hover:text-ink underline underline-offset-2" onClick={() => { setCat(''); setPrio(''); setProject(''); setQ(''); }}>
            Očisti filtre ({activeFilters})
          </button>
        )}
      </Card>

      {layout === 'popis' &&
        (groups.length ? (
          <div className="grid grid-cols-1 gap-6">
            {groups.map((g) => (
              <section key={g.title}>
                <h2 className={cx('text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5', g.title === 'Kasni' ? 'text-peach-ink' : g.title === 'Čeka se' ? 'text-butter-ink' : 'text-muted')}>
                  {g.title === 'Čeka se' && <Hourglass size={12} />}
                  {g.title} <span className="font-normal">· {g.items.length}</span>
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Card>
            <Empty icon={<SquareCheck size={20} />} title="Nema zadataka u ovom prikazu" text="Promijeni filtre ili dodaj novi zadatak." action={<Button variant="primary" onClick={() => open('task')}><Plus size={15} /> Novi zadatak</Button>} />
          </Card>
        ))}

      {layout === 'ploca' && (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          <div className="grid grid-cols-4 gap-4 min-w-[1000px]">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={() => {
                  const t = data.tasks.find((x) => x.id === dragId);
                  if (t) moveTo(t, col.id);
                  setDragId(null);
                  setOverCol(null);
                }}
                className={cx('rounded-[22px] p-3 transition min-h-[320px]', overCol === col.id ? 'bg-lav/20 ring-2 ring-lav/50' : 'bg-surface2/60')}
              >
                <div className="flex items-center justify-between px-1.5 mb-3">
                  <Chip tone={col.tone}>{col.label}</Chip>
                  <span className="text-xs text-muted tabular-nums">{board[col.id].length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {board[col.id].map((t) => (
                    <BoardCard key={t.id} t={t} dragging={dragId === t.id} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} onMove={(c) => moveTo(t, c)} />
                  ))}
                  {!board[col.id].length && <p className="text-xs text-muted text-center py-6">{col.id === 'gotovo' ? 'Završeno u zadnjih 14 dana' : 'Povuci zadatak ovdje'}</p>}
                </div>
                {col.id === 'otvoreno' && (
                  <button type="button" onClick={() => open('task')} className="mt-2.5 w-full h-9 rounded-xl text-[13px] text-muted hover:text-ink hover:bg-surface transition inline-flex items-center justify-center gap-1.5 focus-ring">
                    <Plus size={14} /> Dodaj
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Povuci karticu u drugi stupac. Na iPhoneu i iPadu koristi izbornik statusa na kartici.</p>
        </div>
      )}
    </div>
  );
}

function BoardCard({ t, dragging, onDragStart, onDragEnd, onMove }: { t: Task; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onMove: (c: Column) => void }) {
  const { data } = useStore();
  const { open } = useQuick();
  const project = t.projectId ? data.projects.find((p) => p.id === t.projectId) : undefined;
  const progress = taskProgress(t);
  const due = dueLabel(t);
  const current: Column = t.done ? 'gotovo' : t.status;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={() => open('task', t)}
      onKeyDown={(e) => e.key === 'Enter' && open('task', t)}
      className={cx('rounded-2xl bg-surface border border-line/80 p-3.5 shadow-soft hover:shadow-lift transition cursor-pointer focus-ring', dragging && 'opacity-50', t.status === 'ceka' && !t.done && 'border-l-4 border-l-butter')}
    >
      <div className="flex items-start gap-2">
        <p className={cx('flex-1 text-sm font-semibold leading-snug', t.done ? 'line-through text-muted' : 'text-ink')}>{t.title}</p>
        <Flag size={13} className={cx('shrink-0 mt-0.5', t.priority === 'visok' ? 'text-peach-ink' : t.priority === 'srednji' ? 'text-butter-ink' : 'text-muted')} fill={t.priority === 'visok' ? 'currentColor' : 'none'} aria-label={`Prioritet: ${t.priority}`} />
      </div>
      {t.status === 'ceka' && !t.done && t.waitingFor && (
        <p className="text-[12px] text-butter-ink mt-1.5 flex items-start gap-1">
          <Hourglass size={11} className="mt-0.5 shrink-0" /> {t.waitingFor}
        </p>
      )}
      {!t.done && (
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
            <div className="h-full rounded-full bg-lav transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-muted tabular-nums">{progress}%</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-muted">
        {due && <span className={cx(due.warn && 'text-peach-ink font-semibold')}>{due.text}</span>}
        {project && <Chip tone={project.tone} className="max-w-[150px]">{project.name}</Chip>}
        <label htmlFor={`mv-${t.id}`} className="sr-only">Premjesti u</label>
        <select
          id={`mv-${t.id}`}
          value={current}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onMove(e.target.value as Column)}
          className="ml-auto h-7 rounded-lg bg-surface2 text-[11px] font-medium text-ink pl-2 border-0 focus:outline-none focus:ring-2 focus:ring-lav"
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
