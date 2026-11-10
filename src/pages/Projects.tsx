import React, { useState } from 'react';
import { Plus, LayoutGrid, Columns3, Pencil, StickyNote, CalendarDays, GripVertical, FolderKanban } from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { Button, Card, Chip, Empty, Modal, PageHeader, ProgressBar, Segmented } from '../ui';
import { TaskRow } from '../TaskRow';
import type { Project, ProjectStatus } from '../types';
import { STATUS_LABEL, TONE_INK, TONE_SOFT, cx, diffDays, fmtDate, projectProgress, stripHtml, todayISO } from '../utils';
import { go } from '../nav';

const COLS: ProjectStatus[] = ['planirano', 'u-tijeku', 'na-cekanju', 'zavrseno'];
const COL_TONE = { planirano: 'sky', 'u-tijeku': 'lav', 'na-cekanju': 'butter', zavrseno: 'mint' } as const;

export function Projects() {
  const { data, upsert, toast } = useStore();
  const { open } = useQuick();
  const [view, setView] = useState<'kartice' | 'kanban'>('kartice');
  const [detail, setDetail] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ProjectStatus | null>(null);

  const moveTo = (p: Project, status: ProjectStatus) => {
    if (p.status === status) return;
    upsert('projects', { ...p, status });
    toast(`„${p.name}" → ${STATUS_LABEL[status]}`);
  };

  const project = detail ? data.projects.find((p) => p.id === detail) : undefined;

  return (
    <div>
      <PageHeader
        tone="lav"
        title="Projekti"
        subtitle={`${data.projects.filter((p) => p.status === 'u-tijeku').length} u tijeku · ${data.projects.length} ukupno`}
        actions={
          <>
            <Segmented
              label="Prikaz projekata"
              value={view}
              onChange={setView}
              options={[
                { value: 'kartice', label: 'Kartice', icon: <LayoutGrid size={14} /> },
                { value: 'kanban', label: 'Kanban', icon: <Columns3 size={14} /> },
              ]}
            />
            <Button variant="primary" onClick={() => open('project')}>
              <Plus size={16} /> Novi projekt
            </Button>
          </>
        }
      />

      {data.projects.length === 0 && (
        <Card>
          <Empty icon={<FolderKanban size={20} />} title="Još nema projekata" action={<Button variant="primary" onClick={() => open('project')}>Kreiraj prvi projekt</Button>} />
        </Card>
      )}

      {view === 'kartice' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.projects.map((p) => (
            <ProjectCard key={p.id} p={p} onOpen={() => setDetail(p.id)} />
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
          <div className="grid grid-cols-4 gap-4 min-w-[960px]">
            {COLS.map((col) => {
              const items = data.projects.filter((p) => p.status === col);
              return (
                <div
                  key={col}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
                  onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
                  onDrop={() => {
                    const p = data.projects.find((x) => x.id === dragId);
                    if (p) moveTo(p, col);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={cx('rounded-[22px] p-3 transition min-h-[300px]', overCol === col ? 'bg-lav/20 ring-2 ring-lav/50' : 'bg-surface2/60')}
                >
                  <div className="flex items-center justify-between px-1.5 mb-3">
                    <Chip tone={COL_TONE[col]}>{STATUS_LABEL[col]}</Chip>
                    <span className="text-xs text-muted tabular-nums">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {items.map((p) => (
                      <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragEnd={() => setDragId(null)} className={cx('relative', dragId === p.id && 'opacity-50')}>
                        <ProjectCard p={p} compact onOpen={() => setDetail(p.id)} />
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-xs text-muted text-center py-6">Povuci projekt ovdje</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3">Povuci karticu u drugi stupac ili promijeni status u detaljima projekta.</p>
        </div>
      )}

      {project && <ProjectDetail p={project} onClose={() => setDetail(null)} onStatus={(s) => moveTo(project, s)} />}
    </div>
  );
}

function ProjectCard({ p, onOpen, compact }: { p: Project; onOpen: () => void; compact?: boolean }) {
  const { data } = useStore();
  const pr = projectProgress(p.id, data.tasks);
  const tasks = data.tasks.filter((t) => t.projectId === p.id);
  const openT = tasks.filter((t) => !t.done).length;
  const notes = data.notes.filter((n) => n.projectId === p.id && n.space !== 'privatno').length;
  const daysLeft = p.deadline ? diffDays(p.deadline, todayISO()) : null;
  return (
    <button type="button" onClick={onOpen} className={cx('w-full text-left rounded-[22px] bg-surface border border-line/80 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition focus-ring', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-start justify-between gap-2">
        <span className={cx('rounded-xl grid place-items-center font-bold shrink-0', compact ? 'w-8 h-8 text-sm' : 'w-10 h-10', TONE_SOFT[p.tone], TONE_INK[p.tone])}>{p.name[0]}</span>
        {compact ? <GripVertical size={15} className="text-muted/60" /> : <Chip tone={COL_TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip>}
      </div>
      <h3 className={cx('font-semibold text-ink mt-3', compact ? 'text-sm' : 'text-base')}>{p.name}</h3>
      {!compact && <p className="text-sm text-muted mt-1 line-clamp-2 min-h-[2.6em]">{p.description}</p>}
      <div className="flex items-center gap-2 mt-3">
        <ProgressBar value={pr} tone={p.tone} className="flex-1" />
        <span className="text-xs font-semibold text-ink tabular-nums">{pr}%</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted">
        <span>
          {openT} otvoreno / {tasks.length}
        </span>
        {notes > 0 && (
          <span className="inline-flex items-center gap-1">
            <StickyNote size={11} /> {notes}
          </span>
        )}
        {p.deadline && (
          <span className={cx('inline-flex items-center gap-1', daysLeft !== null && daysLeft < 0 && p.status !== 'zavrseno' && 'text-peach-ink font-semibold')}>
            <CalendarDays size={11} /> {fmtDate(p.deadline)}
          </span>
        )}
      </div>
    </button>
  );
}

function ProjectDetail({ p, onClose, onStatus }: { p: Project; onClose: () => void; onStatus: (s: ProjectStatus) => void }) {
  const { data } = useStore();
  const { open } = useQuick();
  const tasks = data.tasks.filter((t) => t.projectId === p.id).sort((a, b) => Number(a.done) - Number(b.done));
  const notes = data.notes.filter((n) => n.projectId === p.id && n.space !== 'privatno');
  const pr = projectProgress(p.id, data.tasks);
  return (
    <Modal open onClose={onClose} title={p.name} wide>
      <div className="grid grid-cols-1 gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="pd-status" className="sr-only">
            Status
          </label>
          <select id="pd-status" value={p.status} onChange={(e) => onStatus(e.target.value as ProjectStatus)} className="h-8 rounded-lg bg-surface2 px-2 text-[13px] font-medium text-ink border-0 focus:outline-none focus:ring-2 focus:ring-lav">
            {COLS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {p.deadline && <Chip>Rok {fmtDate(p.deadline)}</Chip>}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { onClose(); open('project', p); }}>
            <Pencil size={13} /> Uredi
          </Button>
        </div>
        {p.description && <p className="text-sm text-ink/80">{p.description}</p>}
        <div className="flex items-center gap-3">
          <ProgressBar value={pr} tone={p.tone} className="flex-1 h-2.5" />
          <span className="text-sm font-semibold text-ink tabular-nums">{pr}%</span>
        </div>
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-ink text-sm">Zadaci · {tasks.length}</h3>
            <Button size="sm" onClick={() => open('task', { projectId: p.id })}>
              <Plus size={14} /> Zadatak
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} showProject={false} />
            ))}
            {!tasks.length && <p className="text-sm text-muted">Dodaj prvi zadatak za ovaj projekt.</p>}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-ink text-sm">Bilješke · {notes.length}</h3>
            <Button size="sm" onClick={() => open('note', { projectId: p.id })}>
              <Plus size={14} /> Bilješka
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                className="text-left rounded-2xl bg-butter/20 p-3 hover:bg-butter/30 transition focus-ring"
                onClick={() => {
                  try { sessionStorage.setItem('mw-open-note', n.id); } catch { /* ignore */ }
                  onClose();
                  go('biljeske');
                }}
              >
                <p className="text-sm font-medium text-ink truncate">{n.title}</p>
                <p className="text-xs text-muted line-clamp-2 mt-1">{stripHtml(n.html)}</p>
              </button>
            ))}
            {!notes.length && <p className="text-sm text-muted">Nema povezanih bilješki.</p>}
          </div>
        </section>
      </div>
    </Modal>
  );
}
