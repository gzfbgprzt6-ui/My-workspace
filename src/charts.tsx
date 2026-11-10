import React, { useState } from 'react';
import type { Txn } from './types';
import { MONTHS_SHORT, eur, eur0, fromISO, todayISO, toISO } from './utils';

export interface MonthPoint {
  key: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
}

export function monthlySeries(txns: Txn[], months = 6): MonthPoint[] {
  const out: MonthPoint[] = [];
  const base = fromISO(todayISO());
  base.setDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = toISO(d).slice(0, 7);
    const inM = txns.filter((t) => t.date.startsWith(key));
    out.push({
      key,
      label: MONTHS_SHORT[d.getMonth()],
      income: inM.filter((t) => t.type === 'prihod').reduce((s, t) => s + t.amount, 0),
      expense: inM.filter((t) => t.type === 'rashod').reduce((s, t) => s + t.amount, 0),
    });
  }
  return out;
}

const niceMax = (v: number) => {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
};

/** Grouped income/expense columns with a light grid and value tooltip. */
export function IncomeExpenseChart({ data, height = 180, compact = false }: { data: MonthPoint[]; height?: number; compact?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = height;
  const padL = compact ? 8 : 44;
  const padB = 24;
  const padT = 10;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))));
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const group = innerW / data.length;
  const bw = Math.min(18, group / 3.2);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Prihodi i rashodi po mjesecima">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeDasharray={t === 0 ? '' : '3 4'} />
            {!compact && (
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))" className="tabular-nums">
                {t >= 1000 ? `${(t / 1000).toLocaleString('hr-HR')}k` : t}
              </text>
            )}
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + group * i + group / 2;
          const active = hover === i;
          const last = i === data.length - 1;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} className="cursor-pointer">
              <rect x={cx - group / 2} y={padT} width={group} height={innerH} fill={active ? 'rgb(var(--surface2))' : 'transparent'} rx="10" />
              <rect x={cx - bw - 2} y={y(d.income)} width={bw} height={Math.max(0, padT + innerH - y(d.income))} rx="5" fill="#6DD3B2" opacity={last || active ? 1 : 0.75} />
              <rect x={cx + 2} y={y(d.expense)} width={bw} height={Math.max(0, padT + innerH - y(d.expense))} rx="5" fill="#FFB59E" opacity={last || active ? 1 : 0.75} />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="11.5" fill={last ? 'rgb(var(--ink))' : 'rgb(var(--muted))'} fontWeight={last ? 600 : 400}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 right-0 bg-surface border border-line shadow-lift rounded-xl px-3 py-2 text-xs pointer-events-none tabular-nums">
          <div className="font-semibold text-ink mb-0.5">{data[hover].label}</div>
          <div className="text-mint-ink">Prihodi {eur(data[hover].income)}</div>
          <div className="text-peach-ink">Rashodi {eur(data[hover].expense)}</div>
        </div>
      )}
    </div>
  );
}

const DONUT_COLORS = ['#FFB59E', '#A78BFA', '#6DD3B2', '#F5D67B', '#A5C7F7', '#F7A8C4', '#9FDDE0', '#C9B8F5', '#FFD3B5', '#BFC6D6'];

export function CategoryDonut({ items, size = 168 }: { items: { label: string; value: number }[]; size?: number }) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label="Rashodi po kategorijama">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface2))" strokeWidth="22" />
          {items.map((it, i) => {
            const len = (it.value / total) * c;
            const el = (
              <circle
                key={it.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[11px] text-muted">Ukupno</div>
            <div className="font-bold text-ink tabular-nums">{eur0(total)}</div>
          </div>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 w-full text-sm">
        {items.slice(0, 7).map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="flex-1 text-ink truncate">{it.label}</span>
            <span className="text-muted tabular-nums">{Math.round((it.value / total) * 100)} %</span>
            <span className="text-ink tabular-nums w-20 text-right">{eur0(it.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ values, color = '#A78BFA', w = 120, h = 36 }: { values: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} aria-hidden="true">
      <path d={`${d} L${last[0]},${h} L3,${h} Z`} fill={color} opacity="0.15" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="rgb(var(--surface))" strokeWidth="1.5" />
    </svg>
  );
}
