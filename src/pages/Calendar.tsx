import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Flag, Link2 } from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { Button, Card, IconButton, PageHeader, Segmented, Chip } from '../ui';
import type { CalEvent, Task } from '../types';
import { DAYS_SHORT, MONTHS, TONE_BG, TONE_SOFT, TONE_INK, addDays, cx, fmtDate, fromISO, startOfWeek, toISO, todayISO, weekdayName } from '../utils';
import { TaskRow } from '../TaskRow';

type View = 'mjesec' | 'tjedan' | 'dan';
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07–22
const HOUR_PX = 52;

export function Calendar() {
  const { data } = useStore();
  const { open } = useQuick();
  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'dan' : 'mjesec'));
  const [cursor, setCursor] = useState(todayISO());
  const today = todayISO();

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of data.events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    m.forEach((v) => v.sort((a, b) => a.start.localeCompare(b.start)));
    return m;
  }, [data.events]);
  const tasksByDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of data.tasks) if (t.due && !t.done) m.set(t.due, [...(m.get(t.due) ?? []), t]);
    return m;
  }, [data.tasks]);

  const move = (dir: number) => {
    if (view === 'mjesec') {
      const d = fromISO(cursor);
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      setCursor(toISO(d));
    } else setCursor(addDays(cursor, view === 'tjedan' ? 7 * dir : dir));
  };

  const cd = fromISO(cursor);
  const title =
    view === 'mjesec'
      ? `${MONTHS[cd.getMonth()]} ${cd.getFullYear()}.`
      : view === 'tjedan'
        ? `${fmtDate(startOfWeek(cursor))} – ${fmtDate(addDays(startOfWeek(cursor), 6))}`
        : `${weekdayName(cursor)}, ${fmtDate(cursor)}`;

  return (
    <div>
      <PageHeader
        tone="sky"
        title="Kalendar"
        subtitle="Događaji i rokovi zadataka na jednom mjestu"
        actions={
          <>
            <Button disabled title="Planirano za kasniju verziju">
              <Link2 size={15} /> Google Kalendar · uskoro
            </Button>
            <Button variant="primary" onClick={() => open('event', { date: view === 'mjesec' ? today : cursor })}>
              <Plus size={16} /> Novi događaj
            </Button>
          </>
        }
      />
      <Card className="!p-3 md:!p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1">
            <IconButton label="Prethodno" onClick={() => move(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton label="Sljedeće" onClick={() => move(1)}>
              <ChevronRight size={18} />
            </IconButton>
            <h2 className="text-lg font-semibold text-ink ml-1.5 tabular-nums">{title}</h2>
            <Button size="sm" variant="ghost" className="ml-1" onClick={() => setCursor(today)}>
              Danas
            </Button>
          </div>
          <Segmented<View>
            label="Prikaz kalendara"
            value={view}
            onChange={setView}
            options={[
              { value: 'dan', label: 'Dan' },
              { value: 'tjedan', label: 'Tjedan' },
              { value: 'mjesec', label: 'Mjesec' },
            ]}
          />
        </div>

        {view === 'mjesec' && (
          <MonthGrid cursor={cursor} today={today} eventsByDate={eventsByDate} tasksByDate={tasksByDate} onPickDay={(d) => { setCursor(d); setView('dan'); }} onEvent={(e) => open('event', e)} />
        )}
        {view !== 'mjesec' && (
          <TimeGrid
            days={view === 'tjedan' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)) : [cursor]}
            today={today}
            eventsByDate={eventsByDate}
            tasksByDate={tasksByDate}
            onEvent={(e) => open('event', e)}
            onSlot={(date, h) => open('event', { date, start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 1).padStart(2, '0')}:00` })}
          />
        )}
      </Card>

      {view === 'dan' && (
        <Card className="mt-4">
          <h3 className="font-semibold text-ink mb-3">Rokovi za {fmtDate(cursor)}</h3>
          {(tasksByDate.get(cursor) ?? []).length ? (
            <div className="grid grid-cols-1 gap-2">
              {(tasksByDate.get(cursor) ?? []).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nema otvorenih zadataka s ovim rokom.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function MonthGrid({ cursor, today, eventsByDate, tasksByDate, onPickDay, onEvent }: { cursor: string; today: string; eventsByDate: Map<string, CalEvent[]>; tasksByDate: Map<string, Task[]>; onPickDay: (d: string) => void; onEvent: (e: CalEvent) => void }) {
  const first = fromISO(cursor);
  first.setDate(1);
  const start = startOfWeek(toISO(first));
  const month = first.getMonth();
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days[35] && fromISO(days[35]).getMonth() !== month ? days.slice(0, 35) : days;

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="text-[11px] font-semibold uppercase tracking-wider text-muted text-center py-1.5">
            {DAYS_SHORT[d]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((d) => {
          const inMonth = fromISO(d).getMonth() === month;
          const ev = eventsByDate.get(d) ?? [];
          const tk = tasksByDate.get(d) ?? [];
          const isToday = d === today;
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              onClick={() => onPickDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && onPickDay(d)}
              className={cx('min-h-[64px] md:min-h-[104px] rounded-xl p-1 md:p-1.5 text-left transition cursor-pointer focus-ring', inMonth ? 'bg-surface2/50 hover:bg-surface2' : 'opacity-45 hover:opacity-70')}
            >
              <div className="flex items-center justify-between">
                <span className={cx('text-xs md:text-[13px] w-6 h-6 md:w-7 md:h-7 grid place-items-center rounded-full tabular-nums', isToday ? 'bg-ink text-bg font-bold' : 'text-ink')}>{fromISO(d).getDate()}</span>
                {tk.length > 0 && (
                  <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold text-mint-ink" title={`${tk.length} rokova`}>
                    <Flag size={10} />
                    {tk.length}
                  </span>
                )}
              </div>
              <div className="mt-1 grid gap-0.5">
                {ev.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={(x) => { x.stopPropagation(); onEvent(e); }}
                    className={cx('hidden md:block text-left truncate text-[11px] font-medium rounded-md px-1.5 py-0.5', TONE_SOFT[e.tone], TONE_INK[e.tone])}
                  >
                    {e.start} {e.title}
                  </button>
                ))}
                {ev.length > 2 && <span className="hidden md:block text-[10px] text-muted px-1">+{ev.length - 2} još</span>}
                <div className="flex md:hidden gap-0.5 flex-wrap px-0.5">
                  {ev.slice(0, 3).map((e) => (
                    <span key={e.id} className={cx('w-1.5 h-1.5 rounded-full', TONE_BG[e.tone])} />
                  ))}
                  {tk.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-mint-ink" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({ days, today, eventsByDate, tasksByDate, onEvent, onSlot }: { days: string[]; today: string; eventsByDate: Map<string, CalEvent[]>; tasksByDate: Map<string, Task[]>; onEvent: (e: CalEvent) => void; onSlot: (date: string, h: number) => void }) {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const multi = days.length > 1;
  return (
    <div className="overflow-x-auto">
      <div className={cx(multi && 'min-w-[720px]')}>
        <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
          <div />
          {days.map((d) => (
            <div key={d} className="text-center pb-2">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">{DAYS_SHORT[fromISO(d).getDay()]}</div>
              <div className={cx('mx-auto mt-0.5 w-8 h-8 grid place-items-center rounded-full text-sm font-semibold tabular-nums', d === today ? 'bg-ink text-bg' : 'text-ink')}>{fromISO(d).getDate()}</div>
              <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[20px] px-1">
                {(tasksByDate.get(d) ?? []).slice(0, multi ? 1 : 4).map((t) => (
                  <Chip key={t.id} tone="mint" className="max-w-full">
                    <Flag size={9} /> <span className="truncate">{t.title}</span>
                  </Chip>
                ))}
                {multi && (tasksByDate.get(d) ?? []).length > 1 && <span className="text-[10px] text-muted">+{(tasksByDate.get(d) ?? []).length - 1}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="relative grid border-t border-line" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0,1fr))` }}>
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="text-[11px] text-muted text-right pr-2 -translate-y-2 tabular-nums">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l border-line">
              {HOURS.map((h) => (
                <button key={h} type="button" aria-label={`Novi događaj ${fmtDate(d)} u ${h}:00`} onClick={() => onSlot(d, h)} style={{ height: HOUR_PX }} className="block w-full border-b border-line/60 hover:bg-sky/10 transition" />
              ))}
              {d === today && nowMin >= 7 * 60 && nowMin <= 23 * 60 && (
                <div className="absolute left-0 right-0 h-0.5 bg-peach z-10 pointer-events-none" style={{ top: ((nowMin - 7 * 60) / 60) * HOUR_PX }}>
                  <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-peach" />
                </div>
              )}
              {(eventsByDate.get(d) ?? []).map((e) => {
                const top = ((Math.max(toMin(e.start), 7 * 60) - 7 * 60) / 60) * HOUR_PX;
                const h = Math.max(24, ((toMin(e.end) - toMin(e.start)) / 60) * HOUR_PX - 3);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEvent(e)}
                    className={cx('absolute left-1 right-1 rounded-xl px-2 py-1 text-left overflow-hidden border-l-[3px] hover:shadow-soft transition focus-ring', TONE_SOFT[e.tone], TONE_INK[e.tone])}
                    style={{ top: top + 1, height: h, borderLeftColor: 'currentColor' }}
                  >
                    <div className="text-[12px] font-semibold leading-tight truncate">{e.title}</div>
                    {h > 34 && (
                      <div className="text-[11px] opacity-80 truncate tabular-nums">
                        {e.start}–{e.end}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
