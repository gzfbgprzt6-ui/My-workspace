import React, { useMemo, useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownRight, PiggyBank, Repeat, Search, Pencil, Check, Target, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { Button, Card, CardHeader, Chip, IconButton, PageHeader, ProgressBar, Segmented, inputCls, Empty } from '../ui';
import { CategoryDonut, IncomeExpenseChart, monthlySeries } from '../charts';
import { EXPENSE_CATEGORIES } from '../data';
import { MONTHS, TONE_INK, TONE_SOFT, cx, eur, eur0, fmtDate, fromISO, toISO, todayISO, diffDays } from '../utils';

export function Finance() {
  const { data, setBudgets, toast } = useStore();
  const { open } = useQuick();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [type, setType] = useState<'sve' | 'prihod' | 'rashod'>('sve');
  const [q, setQ] = useState('');
  const [editBudgets, setEditBudgets] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const mTx = useMemo(() => data.txns.filter((t) => t.date.startsWith(month)), [data.txns, month]);
  const income = mTx.filter((t) => t.type === 'prihod').reduce((s, t) => s + t.amount, 0);
  const expense = mTx.filter((t) => t.type === 'rashod').reduce((s, t) => s + t.amount, 0);
  const saved = mTx.filter((t) => t.category === 'Štednja').reduce((s, t) => s + t.amount, 0);
  const rate = income ? Math.round(((income - expense + saved) / income) * 100) : 0;

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    mTx.filter((t) => t.type === 'rashod').forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount));
    return Array.from(m, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [mTx]);

  const series = useMemo(() => monthlySeries(data.txns, 6), [data.txns]);
  const list = useMemo(() => {
    let l = mTx;
    if (type !== 'sve') l = l.filter((t) => t.type === type);
    if (q.trim()) l = l.filter((t) => (t.description + t.category).toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) => b.date.localeCompare(a.date));
  }, [mTx, type, q]);
  const recurring = useMemo(() => {
    const seen = new Map<string, (typeof data.txns)[number]>();
    data.txns.filter((t) => t.recurring).forEach((t) => {
      const k = t.description + t.category;
      if (!seen.has(k)) seen.set(k, t);
    });
    return Array.from(seen.values());
  }, [data.txns]);

  const md = fromISO(`${month}-01`);
  const shift = (n: number) => {
    const d = new Date(md.getFullYear(), md.getMonth() + n, 1);
    setMonth(toISO(d).slice(0, 7));
  };
  const isCurrent = month === todayISO().slice(0, 7);

  return (
    <div>
      <PageHeader
        tone="peach"
        title="Financije"
        subtitle="Ručno praćenje prihoda, troškova, budžeta i štednje"
        actions={
          <>
            <Button onClick={() => open('txn', { type: 'prihod', category: 'Plaća' })}>
              <ArrowUpRight size={15} /> Prihod
            </Button>
            <Button variant="primary" onClick={() => open('txn')}>
              <Plus size={16} /> Trošak
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-1 mb-4">
        <IconButton label="Prethodni mjesec" onClick={() => shift(-1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <h2 className="text-base font-semibold text-ink min-w-[140px] text-center">
          {MONTHS[md.getMonth()]} {md.getFullYear()}.
        </h2>
        <IconButton label="Sljedeći mjesec" onClick={() => shift(1)} disabled={isCurrent} className="disabled:opacity-30">
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Stat label="Prihodi" value={eur(income)} icon={<ArrowUpRight size={16} />} tone="mint" />
        <Stat label="Rashodi" value={eur(expense)} icon={<ArrowDownRight size={16} />} tone="peach" />
        <Stat label="Saldo" value={eur(income - expense)} icon={<Wallet size={16} />} tone="lav" warn={income - expense < 0} />
        <Stat label="Stopa štednje" value={`${rate} %`} icon={<PiggyBank size={16} />} tone="sky" sub="uključuje prijenose na štednju" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-7">
          <CardHeader title="Prihodi i rashodi" subtitle="Zadnjih 6 mjeseci" />
          <IncomeExpenseChart data={series} height={220} />
          <div className="flex gap-4 text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-mint" /> Prihodi</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-peach" /> Rashodi</span>
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Rashodi po kategorijama" subtitle={`${MONTHS[md.getMonth()]} ${md.getFullYear()}.`} />
          {byCat.length ? <CategoryDonut items={byCat} /> : <Empty icon={<Wallet size={20} />} title="Nema rashoda u ovom mjesecu" />}
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader
            title="Budžeti"
            subtitle="Mjesečna ograničenja po kategoriji"
            action={
              editBudgets ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setBudgets(data.budgets.map((b) => ({ ...b, limit: Number((draft[b.category] ?? String(b.limit)).replace(',', '.')) || b.limit })));
                    setEditBudgets(false);
                    toast('Budžeti su spremljeni');
                  }}
                >
                  <Check size={14} /> Spremi
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setDraft({}); setEditBudgets(true); }}>
                  <Pencil size={13} /> Uredi
                </Button>
              )
            }
          />
          <div className="grid grid-cols-1 gap-4">
            {data.budgets.map((b) => {
              const spent = mTx.filter((t) => t.type === 'rashod' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
              const pct = Math.round((spent / b.limit) * 100);
              const tone = pct >= 100 ? 'peach' : pct >= 80 ? 'butter' : 'mint';
              return (
                <div key={b.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                    <span className="font-medium text-ink">{b.category}</span>
                    {editBudgets ? (
                      <span className="flex items-center gap-1 text-muted text-xs">
                        <label htmlFor={`b-${b.category}`} className="sr-only">Limit za {b.category}</label>
                        <input id={`b-${b.category}`} inputMode="decimal" className="w-20 h-7 rounded-lg bg-surface2 px-2 text-right text-ink tabular-nums focus:outline-none focus:ring-2 focus:ring-peach" defaultValue={b.limit} onChange={(e) => setDraft((d) => ({ ...d, [b.category]: e.target.value }))} /> €
                      </span>
                    ) : (
                      <span className="text-muted tabular-nums text-[13px]">
                        <b className={cx(pct >= 100 ? 'text-peach-ink' : 'text-ink')}>{eur0(spent)}</b> / {eur0(b.limit)}
                      </span>
                    )}
                  </div>
                  <ProgressBar value={pct} tone={tone} />
                  {pct >= 100 && <p className="text-xs text-peach-ink mt-1">Prekoračeno za {eur(spent - b.limit)}</p>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader title="Ciljevi štednje" action={<Button size="sm" variant="ghost" onClick={() => open('goal')}><Plus size={14} /> Cilj</Button>} />
          <div className="grid sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3 gap-3">
            {data.goals.map((g) => {
              const pct = Math.round((g.saved / g.target) * 100);
              return (
                <button key={g.id} type="button" onClick={() => open('goal', g)} className={cx('text-left rounded-2xl p-4 transition hover:-translate-y-0.5 focus-ring', TONE_SOFT[g.tone])}>
                  <div className="flex items-center justify-between">
                    <Target size={16} className={TONE_INK[g.tone]} />
                    <span className={cx('text-xs font-bold tabular-nums', TONE_INK[g.tone])}>{pct}%</span>
                  </div>
                  <p className="font-semibold text-sm text-ink mt-2">{g.name}</p>
                  <p className="text-xs text-muted tabular-nums mt-0.5">
                    {eur0(g.saved)} od {eur0(g.target)}
                  </p>
                  <ProgressBar value={pct} tone={g.tone} className="mt-2.5 bg-surface/70" />
                  {g.deadline && <p className="text-[11px] text-muted mt-2">Rok {fmtDate(g.deadline)} · još {Math.max(0, Math.round(diffDays(g.deadline, todayISO()) / 30))} mj.</p>}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader title="Transakcije" subtitle={`${list.length} u odabranom mjesecu`} />
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Segmented label="Vrsta transakcije" value={type} onChange={setType} options={[{ value: 'sve', label: 'Sve' }, { value: 'rashod', label: 'Rashodi' }, { value: 'prihod', label: 'Prihodi' }]} />
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="tx-search" aria-label="Pretraži transakcije" className={cx(inputCls, 'pl-9')} placeholder="Pretraži" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <ul className="divide-y divide-line/70">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => open('txn', t)} className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-surface2/50 rounded-xl transition focus-ring">
                  <span className={cx('grid place-items-center w-9 h-9 rounded-xl shrink-0', t.type === 'prihod' ? 'bg-mint/20 text-mint-ink' : 'bg-peach/20 text-peach-ink')}>
                    {t.type === 'prihod' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.description}</p>
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      {fmtDate(t.date)} · {t.category}
                      {t.recurring && <Repeat size={11} aria-label="Ponavlja se" />}
                    </p>
                  </div>
                  <span className={cx('text-sm font-semibold tabular-nums', t.type === 'prihod' ? 'text-mint-ink' : 'text-ink')}>
                    {t.type === 'prihod' ? '+' : '−'}
                    {eur(t.amount)}
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="py-8 text-center text-sm text-muted">Nema transakcija za ovaj prikaz.</li>}
          </ul>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Ponavljajuće stavke" subtitle="Mjesečne obveze i primanja" />
          <ul className="grid grid-cols-1 gap-2">
            {recurring.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl bg-surface2/60 px-3 py-2.5">
                <Repeat size={14} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{t.description}</p>
                  <p className="text-[11px] text-muted">{fromISO(t.date).getDate()}. u mjesecu</p>
                </div>
                <span className={cx('text-sm font-semibold tabular-nums', t.type === 'prihod' ? 'text-mint-ink' : 'text-ink')}>{eur(t.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">Ponavljajuće stavke knjiže se automatski za tekući mjesec, na isti dan, kad otvoriš aplikaciju.</p>
          <div className="mt-4 rounded-xl border border-dashed border-line p-3 text-xs text-muted">
            Kategorije troškova: {EXPENSE_CATEGORIES.join(', ')}.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone, sub, warn }: { label: string; value: string; icon: React.ReactNode; tone: 'mint' | 'peach' | 'lav' | 'sky'; sub?: string; warn?: boolean }) {
  return (
    <Card className="!p-4 md:!p-5">
      <span className={cx('grid place-items-center w-9 h-9 rounded-xl', TONE_SOFT[tone], TONE_INK[tone])}>{icon}</span>
      <p className="text-xs text-muted mt-3">{label}</p>
      <p className={cx('text-xl md:text-2xl font-bold tracking-tight tabular-nums', warn ? 'text-peach-ink' : 'text-ink')}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}
