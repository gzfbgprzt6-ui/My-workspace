import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, CalendarClock, FolderKanban, Target, Wallet } from 'lucide-react';
import { useStore } from '../store';
import { Card, CardHeader, Chip, IconButton, PageHeader, ProgressBar } from '../ui';
import { TaskRow } from '../TaskRow';
import { DAYS_SHORT, PRIORITY_RANK, STATUS_LABEL, addDays, cx, eur, fmtDate, fromISO, projectProgress, relativeDue, startOfWeek, todayISO } from '../utils';
import { plural } from './Dashboard';

export function WeeklyReview() {
  const { data } = useStore();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayISO()));
  const weekEnd = addDays(weekStart, 6);
  const nextEnd = addDays(weekEnd, 7);
  const inWeek = (d?: string) => !!d && d >= weekStart && d <= weekEnd;

  const completed = useMemo(() => data.tasks.filter((t) => t.done && inWeek(t.completedAt)), [data.tasks, weekStart]);
  const upcoming = useMemo(
    () => data.tasks.filter((t) => !t.done && t.due && t.due > weekEnd && t.due <= nextEnd).sort((a, b) => a.due!.localeCompare(b.due!)),
    [data.tasks, weekStart],
  );
  const overdue = data.tasks.filter((t) => !t.done && t.due && t.due < todayISO());
  const priorities = data.tasks.filter((t) => !t.done && t.priority === 'visok').sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9')).slice(0, 5);
  const wTx = data.txns.filter((t) => inWeek(t.date));
  const wIn = wTx.filter((t) => t.type === 'prihod').reduce((s, t) => s + t.amount, 0);
  const wOut = wTx.filter((t) => t.type === 'rashod').reduce((s, t) => s + t.amount, 0);

  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { d, n: data.tasks.filter((t) => t.done && t.completedAt === d).length };
  });
  const maxDay = Math.max(1, ...perDay.map((x) => x.n));

  return (
    <div>
      <PageHeader title="Tjedni pregled" subtitle="Pogledaj unatrag, isplaniraj unaprijed" />
      <div className="flex items-center gap-1 mb-4">
        <IconButton label="Prethodni tjedan" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft size={18} />
        </IconButton>
        <h2 className="text-base font-semibold text-ink tabular-nums">
          {fmtDate(weekStart)} – {fmtDate(weekEnd)}
        </h2>
        <IconButton label="Sljedeći tjedan" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <Card tone="mint" className="xl:col-span-5 !border-transparent">
          <CardHeader icon={<CircleCheck size={16} />} title="Završeno ovaj tjedan" />
          <p className="text-5xl font-bold text-ink tabular-nums">{completed.length}</p>
          <p className="text-sm text-muted">{plural(completed.length, 'zadatak', 'zadatka', 'zadataka')}</p>
          <div className="flex items-end gap-2 h-24 mt-5" aria-label="Završeni zadaci po danu">
            {perDay.map((x) => (
              <div key={x.d} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-ink tabular-nums">{x.n || ''}</span>
                <div className={cx('w-full rounded-lg', x.n ? 'bg-mint' : 'bg-surface/70')} style={{ height: `${Math.max(6, (x.n / maxDay) * 64)}px` }} />
                <span className={cx('text-[10px]', x.d === todayISO() ? 'text-ink font-bold' : 'text-muted')}>{DAYS_SHORT[fromISO(x.d).getDay()]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader icon={<CircleCheck size={16} />} tone="mint" title="Popis završenog" />
          <div className="grid grid-cols-1 gap-0.5 max-h-[260px] overflow-y-auto">
            {completed.map((t) => (
              <TaskRow key={t.id} task={t} compact />
            ))}
            {!completed.length && <p className="text-sm text-muted">Još ništa završeno u ovom tjednu.</p>}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader icon={<CalendarClock size={16} />} tone="sky" title="Rokovi sljedeći tjedan" subtitle={overdue.length ? `${overdue.length} zadataka već kasni` : undefined} />
          <div className="grid grid-cols-1 gap-0.5">
            {[...overdue, ...upcoming].slice(0, 7).map((t) => (
              <TaskRow key={t.id} task={t} compact />
            ))}
            {!upcoming.length && !overdue.length && <p className="text-sm text-muted">Nema rokova u sljedećem tjednu.</p>}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader icon={<Target size={16} />} tone="peach" title="Prioriteti" subtitle="Otvoreni zadaci visokog prioriteta" />
          <ol className="grid grid-cols-1 gap-2">
            {priorities.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-peach/25 text-peach-ink grid place-items-center text-xs font-bold">{i + 1}</span>
                <span className="flex-1 text-ink truncate">{t.title}</span>
                {t.due && <span className="text-xs text-muted">{relativeDue(t.due)}</span>}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader icon={<FolderKanban size={16} />} tone="lav" title="Napredak projekata" />
          <div className="grid grid-cols-1 gap-4">
            {data.projects.filter((p) => p.status !== 'zavrseno').map((p) => {
              const pr = projectProgress(p.id, data.tasks);
              const doneWeek = data.tasks.filter((t) => t.projectId === p.id && t.done && inWeek(t.completedAt)).length;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                    <span className="font-medium text-ink truncate">{p.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {doneWeek > 0 && <Chip tone="mint">+{doneWeek} ovaj tjedan</Chip>}
                      <span className="text-xs text-muted">{STATUS_LABEL[p.status]}</span>
                      <span className="font-semibold text-ink tabular-nums w-9 text-right">{pr}%</span>
                    </span>
                  </div>
                  <ProgressBar value={pr} tone={p.tone} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-5" tone="peach">
          <CardHeader icon={<Wallet size={16} />} title="Financije tjedna" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface/80 p-3">
              <p className="text-xs text-muted">Prihodi</p>
              <p className="font-bold text-mint-ink tabular-nums">{eur(wIn)}</p>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <p className="text-xs text-muted">Rashodi</p>
              <p className="font-bold text-ink tabular-nums">{eur(wOut)}</p>
            </div>
          </div>
          <ul className="mt-3 grid gap-1.5 text-sm">
            {wTx.filter((t) => t.type === 'rashod').sort((a, b) => b.amount - a.amount).slice(0, 4).map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className="text-ink truncate">{t.description}</span>
                <span className="text-muted tabular-nums">{eur(t.amount)}</span>
              </li>
            ))}
            {!wTx.length && <li className="text-muted">Nema transakcija u ovom tjednu.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
