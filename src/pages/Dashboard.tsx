import React, { useMemo } from 'react';
import {
  SquareCheck, CalendarDays, FolderKanban, Wallet, Sparkles, Clock, MapPin, ArrowRight, Plus, StickyNote, Receipt,
  ArrowUpRight, ArrowDownRight, Pin, Target,
} from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { go } from '../nav';
import { Card, CardHeader, Chip, ProgressBar, ProgressRing, Empty } from '../ui';
import { TaskRow } from '../TaskRow';
import { IncomeExpenseChart, monthlySeries, Sparkline } from '../charts';
import {
  PRIORITY_RANK, STATUS_LABEL, TONE_BG, TONE_INK, TONE_SOFT, addDays, cx, diffDays, eur, eur0, fmtDate, greeting,
  projectProgress, relativeDue, stripHtml, todayISO, weekdayName, fmtDateTime,
} from '../utils';

export function Dashboard() {
  const { data, loadSample } = useStore();
  const [sampleBusy, setSampleBusy] = React.useState(false);
  const isEmpty = !data.tasks.length && !data.projects.length && !data.notes.length && !data.txns.length && !data.events.length;
  const { open } = useQuick();
  const today = todayISO();

  const stats = useMemo(() => {
    const dueToday = data.tasks.filter((t) => t.due === today);
    const doneToday = dueToday.filter((t) => t.done).length;
    const open = data.tasks.filter((t) => !t.done);
    const overdue = open.filter((t) => t.due && t.due < today).length;
    const waiting = open.filter((t) => t.status === 'ceka').length;
    const todayEvents = data.events.filter((e) => e.date === today).sort((a, b) => a.start.localeCompare(b.start));
    const weekEnd = addDays(today, 7);
    const weekEvents = data.events.filter((e) => e.date >= today && e.date < weekEnd).length;
    const activeProjects = data.projects.filter((p) => p.status === 'u-tijeku');
    const month = today.slice(0, 7);
    const mTx = data.txns.filter((t) => t.date.startsWith(month));
    const income = mTx.filter((t) => t.type === 'prihod').reduce((s, t) => s + t.amount, 0);
    const expense = mTx.filter((t) => t.type === 'rashod').reduce((s, t) => s + t.amount, 0);
    return { dueToday, doneToday, open, overdue, waiting, todayEvents, weekEvents, activeProjects, income, expense };
  }, [data, today]);

  const priorities = useMemo(() => {
    const focus = data.tasks.filter((t) => !t.done && t.todayFocus);
    const rest = data.tasks
      .filter((t) => !t.done && !t.todayFocus && t.due && t.due <= today)
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    return [...focus, ...rest].slice(0, 3);
  }, [data.tasks, today]);

  const upcoming = useMemo(
    () =>
      data.events
        .filter((e) => e.date >= today)
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        .slice(0, 4),
    [data.events, today],
  );

  const series = useMemo(() => monthlySeries(data.txns, 6), [data.txns]);
  const recentNotes = useMemo(() => data.notes.filter((n) => n.space !== 'privatno').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4), [data.notes]);
  const completion = stats.dueToday.length ? Math.round((stats.doneToday / stats.dueToday.length) * 100) : 0;
  const weekDone = data.tasks.filter((t) => t.done && t.completedAt && diffDays(today, t.completedAt) < 7).length;
  const balance = stats.income - stats.expense;
  const name = data.settings.name.trim();

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3 animate-rise">
        <div>
          <p className="text-sm text-muted">
            {weekdayName(today)}, {fmtDate(today)}
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight text-ink text-balance">
            {greeting()}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="text-muted text-sm mt-0.5">
            Danas imaš {stats.dueToday.length - stats.doneToday} {plural(stats.dueToday.length - stats.doneToday, 'zadatak', 'zadatka', 'zadataka')} i {stats.todayEvents.length}{' '}
            {plural(stats.todayEvents.length, 'događaj', 'događaja', 'događaja')}.
          </p>
        </div>
      </header>

      {isEmpty && (
        <section className="rounded-[22px] border-2 border-dashed border-lav/50 bg-lav/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-rise">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-lav/25 text-lav-ink shrink-0"><Sparkles size={20} /></span>
          <div className="flex-1">
            <p className="font-semibold text-ink">Dobro došao u svoj radni prostor</p>
            <p className="text-sm text-muted mt-0.5">Račun je prazan. Dodaj prvi zadatak ili učitaj primjere da vidiš kako sve izgleda. Primjere kasnije možeš obrisati u Postavkama.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => open('task')} className="h-10 px-4 rounded-xl bg-surface text-ink text-sm font-medium border border-line hover:bg-surface2 transition focus-ring">Prvi zadatak</button>
            <button type="button" disabled={sampleBusy} onClick={async () => { setSampleBusy(true); await loadSample(); setSampleBusy(false); }} className="h-10 px-4 rounded-xl bg-ink text-bg text-sm font-medium hover:opacity-90 transition focus-ring disabled:opacity-60">{sampleBusy ? 'Učitavanje…' : 'Učitaj primjere'}</button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 md:gap-5">
        {/* Hero */}
        <section className="relative min-w-0 overflow-hidden rounded-[26px] bg-lav text-[#1E1640] p-6 md:p-7 md:col-span-6 xl:col-span-8 min-h-[220px] shadow-soft animate-rise">
          <div aria-hidden className="absolute -right-14 -top-20 w-36 h-36 sm:-right-10 sm:-top-14 sm:w-56 sm:h-56 rounded-full bg-butter/80" />
          <div aria-hidden className="hidden sm:block absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-peach/90" />
          <div aria-hidden className="hidden sm:block absolute sm:right-8 sm:bottom-10 sm:w-16 sm:h-16 rounded-full bg-mint" />
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1 text-xs font-semibold">
              <Sparkles size={13} /> Fokus dana
            </span>
            <h2 className="mt-4 text-[34px] md:text-[44px] leading-[1.02] font-bold tracking-tight text-balance">Make today yours.</h2>
            <p className="mt-3 text-[15px] text-[#2E2456] max-w-sm">
              {priorities[0] ? (
                <>
                  Prvi korak: <b>{priorities[0].title}</b>
                </>
              ) : (
                'Svi prioriteti su riješeni. Vrijeme za nešto novo.'
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => go('zadaci')} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#1E1640] text-white text-sm font-medium hover:opacity-90 transition focus-ring">
                Otvori zadatke <ArrowRight size={15} />
              </button>
              <button type="button" onClick={() => go('tjedni-pregled')} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/55 text-[#1E1640] text-sm font-medium hover:bg-white/75 transition focus-ring">
                Tjedni pregled
              </button>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <Card className="md:col-span-6 xl:col-span-4 animate-rise">
          <CardHeader title="Brze radnje" subtitle="Zabilježi u dva dodira" />
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { k: 'task' as const, label: 'Zadatak', icon: <SquareCheck size={18} />, tone: 'mint' as const },
              { k: 'event' as const, label: 'Događaj', icon: <CalendarDays size={18} />, tone: 'sky' as const },
              { k: 'note' as const, label: 'Bilješka', icon: <StickyNote size={18} />, tone: 'butter' as const },
              { k: 'txn' as const, label: 'Trošak', icon: <Receipt size={18} />, tone: 'peach' as const },
            ].map((a) => (
              <button
                key={a.k}
                type="button"
                onClick={() => open(a.k)}
                className={cx('group flex flex-col items-start gap-3 rounded-2xl p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-soft focus-ring', TONE_SOFT[a.tone])}
              >
                <span className={cx('grid place-items-center w-9 h-9 rounded-xl bg-surface/80', TONE_INK[a.tone])}>{a.icon}</span>
                <span className="flex items-center justify-between w-full text-sm font-semibold text-ink">
                  {a.label} <Plus size={15} className="text-muted group-hover:text-ink transition" />
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* KPIs */}
        <div className="col-span-full grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          <Kpi tone="mint" icon={<SquareCheck size={17} />} label="Otvoreni zadaci" value={String(stats.open.length)} foot={[stats.overdue ? `${stats.overdue} kasni` : '', stats.waiting ? `${stats.waiting} čeka` : ''].filter(Boolean).join(' · ') || 'Ništa ne kasni'} footWarn={stats.overdue > 0} onClick={() => go('zadaci')} />
          <Kpi tone="sky" icon={<CalendarDays size={17} />} label="Događaji danas" value={String(stats.todayEvents.length)} foot={`${stats.weekEvents} u sljedećih 7 dana`} onClick={() => go('kalendar')} />
          <Kpi tone="lav" icon={<FolderKanban size={17} />} label="Aktivni projekti" value={String(stats.activeProjects.length)} foot={`${data.projects.filter((p) => p.status !== 'zavrseno').length} ukupno otvoreno`} onClick={() => go('projekti')} />
          <Kpi
            tone="peach"
            icon={<Wallet size={17} />}
            label="Saldo mjeseca"
            value={eur0(balance)}
            foot={`Potrošeno ${eur0(stats.expense)}`}
            onClick={() => go('financije')}
            spark={<Sparkline values={series.map((s) => s.income - s.expense)} color="#E8896B" w={72} h={28} />}
          />
        </div>

        {/* Priorities */}
        <Card className="md:col-span-6 xl:col-span-5">
          <CardHeader icon={<Target size={16} />} tone="mint" title="Top 3 prioriteta" subtitle="Ono što danas pomiče stvari" action={<LinkBtn onClick={() => go('zadaci')} />} />
          {priorities.length ? (
            <div className="grid grid-cols-1 gap-1">
              {priorities.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-mint-ink tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <TaskRow task={t} compact />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<Sparkles size={20} />} title="Sve je riješeno" text="Označi zadatak kao prioritet za danas da se pojavi ovdje." />
          )}
        </Card>

        {/* Progress ring */}
        <Card className="md:col-span-3 xl:col-span-3 flex flex-col">
          <CardHeader title="Napredak danas" subtitle={`${stats.doneToday} od ${stats.dueToday.length} s rokom danas`} />
          <div className="flex-1 grid place-items-center py-2">
            <ProgressRing value={completion} size={136} stroke={13}>
              <div>
                <div className="text-3xl font-bold text-ink tabular-nums">{completion}%</div>
                <div className="text-[11px] text-muted">završeno</div>
              </div>
            </ProgressRing>
          </div>
          <p className="text-center text-xs text-muted mt-3">
            Ovaj tjedan: <b className="text-ink">{weekDone}</b> {plural(weekDone, 'završen zadatak', 'završena zadatka', 'završenih zadataka')}
          </p>
        </Card>

        {/* Upcoming events */}
        <Card className="md:col-span-3 xl:col-span-4">
          <CardHeader icon={<CalendarDays size={16} />} tone="sky" title="Nadolazeće" action={<LinkBtn onClick={() => go('kalendar')} />} />
          {upcoming.length ? (
            <ul className="grid grid-cols-1 gap-2">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => open('event', e)} className="w-full flex items-stretch gap-3 rounded-2xl p-2.5 hover:bg-surface2/70 transition text-left focus-ring">
                    <span className={cx('w-1 rounded-full shrink-0', TONE_BG[e.tone])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{e.title}</p>
                      <p className="text-xs text-muted flex flex-wrap items-center gap-x-2 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {relativeDue(e.date)}, {e.start}
                        </span>
                        {e.location && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin size={11} /> {e.location}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<CalendarDays size={20} />} title="Kalendar je slobodan" />
          )}
        </Card>

        {/* Projects */}
        <Card className="md:col-span-6 xl:col-span-7">
          <CardHeader icon={<FolderKanban size={16} />} tone="lav" title="Aktivni projekti" action={<LinkBtn onClick={() => go('projekti')} />} />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.projects
              .filter((p) => p.status !== 'zavrseno')
              .slice(0, 4)
              .map((p) => {
                const pr = projectProgress(p.id, data.tasks);
                const openCount = data.tasks.filter((t) => t.projectId === p.id && !t.done).length;
                return (
                  <button key={p.id} type="button" onClick={() => go('projekti')} className="text-left rounded-2xl border border-line/80 p-4 hover:shadow-soft hover:-translate-y-0.5 transition bg-surface focus-ring">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cx('w-8 h-8 rounded-xl grid place-items-center text-sm font-bold', TONE_SOFT[p.tone], TONE_INK[p.tone])}>{p.name[0]}</span>
                      <Chip tone={p.status === 'u-tijeku' ? 'lav' : undefined}>{STATUS_LABEL[p.status]}</Chip>
                    </div>
                    <p className="mt-3 font-semibold text-sm text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {openCount} otvoreno{p.deadline ? ` · rok ${fmtDate(p.deadline)}` : ''}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar value={pr} tone={p.tone} className="flex-1" />
                      <span className="text-xs font-semibold text-ink tabular-nums w-9 text-right">{pr}%</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        {/* Finance */}
        <Card className="md:col-span-6 xl:col-span-5">
          <CardHeader icon={<Wallet size={16} />} tone="peach" title="Financije ovog mjeseca" action={<LinkBtn onClick={() => go('financije')} />} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-2xl bg-mint/15 p-3">
              <p className="text-xs text-muted flex items-center gap-1">
                <ArrowUpRight size={13} className="text-mint-ink" /> Prihodi
              </p>
              <p className="font-bold text-ink tabular-nums mt-0.5">{eur(stats.income)}</p>
            </div>
            <div className="rounded-2xl bg-peach/20 p-3">
              <p className="text-xs text-muted flex items-center gap-1">
                <ArrowDownRight size={13} className="text-peach-ink" /> Rashodi
              </p>
              <p className="font-bold text-ink tabular-nums mt-0.5">{eur(stats.expense)}</p>
            </div>
          </div>
          <IncomeExpenseChart data={series} height={150} />
          <div className="flex gap-4 text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-mint" /> Prihodi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-peach" /> Rashodi
            </span>
          </div>
        </Card>

        {/* Recent notes */}
        <Card className="col-span-full">
          <CardHeader icon={<StickyNote size={16} />} tone="butter" title="Nedavno uređene bilješke" action={<LinkBtn onClick={() => go('biljeske')} />} />
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {recentNotes.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem('mw-open-note', n.id);
                  } catch {
                    /* ignore */
                  }
                  go('biljeske');
                }}
                className={cx('text-left rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-soft focus-ring', i === 0 ? 'bg-butter/30' : 'bg-surface2/70')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-ink truncate">{n.title}</p>
                  {n.pinned && <Pin size={13} className="text-butter-ink shrink-0" />}
                </div>
                <p className="text-xs text-muted mt-1.5 line-clamp-2 min-h-[2.5em]">{stripHtml(n.html)}</p>
                <p className="text-[11px] text-muted mt-2.5">{fmtDateTime(n.updatedAt)}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ tone, icon, label, value, foot, footWarn, onClick, spark }: { tone: 'mint' | 'sky' | 'lav' | 'peach'; icon: React.ReactNode; label: string; value: string; foot: string; footWarn?: boolean; onClick: () => void; spark?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 text-left rounded-[22px] bg-surface border border-line/80 shadow-soft p-4 md:p-5 hover:-translate-y-0.5 hover:shadow-lift transition focus-ring animate-rise">
      <div className="flex items-center justify-between">
        <span className={cx('grid place-items-center w-9 h-9 rounded-xl', TONE_SOFT[tone], TONE_INK[tone])}>{icon}</span>
        {spark}
      </div>
      <p className="text-xs text-muted mt-3">{label}</p>
      <p className="text-2xl md:text-[28px] font-bold text-ink tracking-tight tabular-nums leading-tight">{value}</p>
      <p className={cx('text-xs mt-1', footWarn ? 'text-peach-ink font-semibold' : 'text-muted')}>{foot}</p>
    </button>
  );
}

function LinkBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-muted hover:text-ink inline-flex items-center gap-1 h-8 px-2 rounded-lg hover:bg-surface2 transition focus-ring">
      Sve <ArrowRight size={13} />
    </button>
  );
}

/** Croatian plural: 1 zadatak, 2–4 zadatka, 5+ zadataka (11–14 → many). */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
