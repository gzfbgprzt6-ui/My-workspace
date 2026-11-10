import React from 'react';
import { Repeat, ListChecks, Flag, FolderKanban } from 'lucide-react';
import type { Task } from './types';
import { useStore } from './store';
import { useQuick } from './forms';
import { Checkbox, Chip } from './ui';
import { cx, diffDays, relativeDue, todayISO } from './utils';

const PRIO_COLOR = { visok: 'text-peach-ink', srednji: 'text-butter-ink', nizak: 'text-muted' } as const;

export function TaskRow({ task, compact, showProject = true }: { task: Task; compact?: boolean; showProject?: boolean }) {
  const { data, toggleTask, toast } = useStore();
  const { open } = useQuick();
  const project = task.projectId ? data.projects.find((p) => p.id === task.projectId) : undefined;
  const overdue = !task.done && task.due && diffDays(task.due, todayISO()) < 0;
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open('task', task)}
      onKeyDown={(e) => e.key === 'Enter' && open('task', task)}
      className={cx(
        'group flex items-center gap-3 rounded-2xl px-3 transition cursor-pointer focus-ring',
        compact ? 'py-2.5 hover:bg-surface2/70' : 'py-3 bg-surface hover:shadow-soft border border-line/70',
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
        <p className={cx('text-sm font-medium leading-snug truncate', task.done ? 'line-through text-muted' : 'text-ink')}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[12px] text-muted">
          {task.due && <span className={cx(overdue && 'text-peach-ink font-semibold')}>{relativeDue(task.due)}</span>}
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
      {showProject && project && compact && <Chip tone={project.tone} className="hidden sm:inline-flex max-w-[34%] min-w-0">{project.name}</Chip>}
      <Flag size={15} className={cx('shrink-0', PRIO_COLOR[task.priority])} aria-label={`Prioritet: ${task.priority}`} fill={task.priority === 'visok' ? 'currentColor' : 'none'} />
    </div>
  );
}
