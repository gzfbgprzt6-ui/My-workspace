import React, { useMemo, useState } from 'react';
import { Plus, Search, SquareCheck } from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { Button, Card, Empty, PageHeader, Segmented, inputCls } from '../ui';
import { TaskRow } from '../TaskRow';
import { TASK_CATEGORIES } from '../data';
import type { Priority, Task } from '../types';
import { PRIORITY_RANK, addDays, cx, todayISO } from '../utils';

type View = 'danas' | 'nadolazece' | 'sve' | 'zavrseno';

export function Tasks() {
  const { data } = useStore();
  const { open } = useQuick();
  const [view, setView] = useState<View>('sve');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [prio, setPrio] = useState<'' | Priority>('');
  const [project, setProject] = useState('');
  const today = todayISO();

  const filtered = useMemo(() => {
    let list = data.tasks;
    if (view === 'zavrseno') list = list.filter((t) => t.done);
    else list = list.filter((t) => !t.done);
    if (view === 'danas') list = list.filter((t) => (t.due && t.due <= today) || t.todayFocus);
    if (view === 'nadolazece') list = list.filter((t) => t.due && t.due > today);
    if (q.trim()) list = list.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
    if (cat) list = list.filter((t) => t.category === cat);
    if (prio) list = list.filter((t) => t.priority === prio);
    if (project) list = list.filter((t) => (project === '-' ? !t.projectId : t.projectId === project));
    return [...list].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }, [data.tasks, view, q, cat, prio, project, today]);

  const groups = useMemo(() => {
    if (view === 'zavrseno') return [{ title: 'Završeno', items: [...filtered].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')) }];
    const g: { title: string; items: Task[] }[] = [
      { title: 'Kasni', items: [] },
      { title: 'Danas', items: [] },
      { title: 'Sljedećih 7 dana', items: [] },
      { title: 'Kasnije', items: [] },
      { title: 'Bez roka', items: [] },
    ];
    const week = addDays(today, 7);
    for (const t of filtered) {
      if (!t.due) g[4].items.push(t);
      else if (t.due < today) g[0].items.push(t);
      else if (t.due === today) g[1].items.push(t);
      else if (t.due <= week) g[2].items.push(t);
      else g[3].items.push(t);
    }
    return g.filter((x) => x.items.length);
  }, [filtered, view, today]);

  const openCount = data.tasks.filter((t) => !t.done).length;
  const activeFilters = [cat, prio, project, q].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        tone="mint"
        title="Zadaci"
        subtitle={`${openCount} otvorenih · ${data.tasks.filter((t) => t.done).length} završenih`}
        actions={
          <Button variant="primary" onClick={() => open('task')}>
            <Plus size={16} /> Novi zadatak
          </Button>
        }
      />
      <Card className="mb-4 !p-3 md:!p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="overflow-x-auto -mx-1 px-1">
            <Segmented<View>
              label="Prikaz"
              value={view}
              onChange={setView}
              options={[
                { value: 'sve', label: 'Sve otvoreno' },
                { value: 'danas', label: 'Danas' },
                { value: 'nadolazece', label: 'Nadolazeće' },
                { value: 'zavrseno', label: 'Završeno' },
              ]}
            />
          </div>
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="task-search" aria-label="Pretraži zadatke" className={cx(inputCls, 'pl-9')} placeholder="Pretraži zadatke" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            <select id="f-cat" aria-label="Kategorija" className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Kategorija</option>
              {TASK_CATEGORIES.map((c) => (
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

      {groups.length ? (
        <div className="grid grid-cols-1 gap-6">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className={cx('text-xs font-semibold uppercase tracking-wider mb-2 px-1', g.title === 'Kasni' ? 'text-peach-ink' : 'text-muted')}>
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
      )}
    </div>
  );
}
