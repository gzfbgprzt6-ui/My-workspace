import React from 'react';
import { Repeat, ListChecks, Flag, FolderKanban, Hourglass, CalendarRange } from 'lucide-react';
import type { Task } from './types';
import { useStore } from './store';
import { useQuick, STATUS_META } from './forms';
import { Checkbox, Chip } from './ui';
import { cx, diffDays, fmtShort, relativeDue, taskProgress, todayISO } from './utils';

const PRIO_COLOR = { visok: 'text-peach-ink', srednji: 'text-butter-ink', nizak: 'text-muted' } as const;

export function dueLabel(t: Task) {
  if (!t.due) return null;
  const d = diffDays(t.due, todayISO());
  if (t.done) return { text: relativeDue(t.due), warn: false };
  if (d < 0) return { text: `Kasni ${-d} d`, warn: true };
  if (d === 0) return { text: 'Rok danas', warn: true };
  if (d === 1) return { text: 'Rok sutra', warn: false };
  return { text: `Još ${d} d`, warn: false };
}

export function TaskRow({ task, compact, showProject = true }: { task: Task; compact?: boolean; showProject?: boolean }) {
  const { data, toggleTask, toast } = useStore();
  const { open } = useQuick();
  const project = task.projectId ? data.projects.find((p) => p.id === task.projectId) : undefined;
  const subDone = task.subtasks.filter((s) => s.done).length;
  const progress = taskProgress(task);
  const due = dueLabel(task);
  const waiting = !task.done && task.status === 'ceka';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open('task', task)}
      onKeyDown={(e) => e.key === 'Enter' && open('task', task)}
      className={cx(
        'group flex items-center gap-3 rounded-2xl px-3 transition cursor-pointer focus-ring',
        compact ? 'py-2.5 hover:bg-surface2/70' : 'py-3 bg-surface hover:shadow-soft border border-line/70',
        !compact && waiting && 'border-l-4 border-l-butter',
      )}
    >
      <Checkbox
        checked={task.done}
        label={task.done ? `Vrati: ${task.title}` : `Završi: ${task.title}`}
        onChange={() => {
          toggleTask(task.id);
          if (!task.done) toast(task.recurring ? 'Završeno — sljedeće ponavljanje je zakazano' : 'Zadatak je završen');
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className={cx('text-sm font-medium leading-snug truncate', task.done ? 'line-through text-muted' : 'text-ink')}>{task.title}</p>
          {!task.done && task.status !== 'otvoreno' && !compact && <Chip tone={STATUS_META[task.status].tone} className="shrink-0">{STATUS_META[task.status].label}</Chip>}
        </div>
        {waiting && task.waitingFor && (
          <p className="text-[12px] text-butter-ink mt-0.5 flex items-center gap-1 min-w-0">
            <Hourglass size={11} className="shrink-0" /> <span className="truncate">Čeka: {task.waitingFor}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[12px] text-muted">
          {due && <span className={cx(due.warn && 'text-peach-ink font-semibold')}>{due.text}</span>}
          {!compact && task.start && task.due && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarRange size={11} /> {fmtShort(task.start)} → {fmtShort(task.due)}
            </span>
          )}
          {!compact && <span>{task.category}</span>}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks size={12} /> {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.recurring && (
            <span className="inline-flex items-center gap-1" title={`Ponavlja se ${task.recurring}`}>
              <Repeat size={12} /> {task.recurring}
            </span>
          )}
          {showProject && project && !compact && (
            <span className="inline-flex items-center gap-1">
              <FolderKanban size={12} /> {project.name}
            </span>
          )}
        </div>
      </div>
      {!task.done && progress > 0 && progress < 100 && (
        <div className="hidden sm:flex items-center gap-2 w-24 shrink-0" title={`Napredak ${progress}%`}>
          <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
            <div className="h-full rounded-full bg-lav" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-muted tabular-nums w-8 text-right">{progress}%</span>
        </div>
      )}
      {showProject && project && compact && <Chip tone={project.tone} className="hidden sm:inline-flex max-w-[30%] min-w-0">{project.name}</Chip>}
      <Flag size={15} className={cx('shrink-0', PRIO_COLOR[task.priority])} aria-label={`Prioritet: ${task.priority}`} fill={task.priority === 'visok' ? 'currentColor' : 'none'} />
    </div>
  );
}
