import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Tone } from './types';
import { cx, TONE_INK, TONE_SOFT } from './utils';

export function Card({
  children,
  className,
  tone,
  as: As = 'section',
  ...rest
}: { children: React.ReactNode; className?: string; tone?: Tone; as?: 'section' | 'div' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cx(
        'min-w-0 rounded-[22px] border border-line/80 shadow-soft p-5 transition-shadow',
        tone ? TONE_SOFT[tone] : 'bg-surface',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  icon,
  title,
  tone,
  action,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  tone?: Tone;
  action?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className={cx('grid place-items-center w-8 h-8 rounded-xl shrink-0', tone ? cx(TONE_SOFT[tone], TONE_INK[tone]) : 'bg-surface2 text-ink')}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] leading-tight text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger';
export function Button({
  variant = 'soft',
  size = 'md',
  className,
  children,
  ...rest
}: { variant?: BtnVariant; size?: 'sm' | 'md' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-ink text-bg hover:opacity-90 shadow-sm',
        variant === 'soft' && 'bg-surface2 text-ink hover:bg-line',
        variant === 'ghost' && 'text-muted hover:text-ink hover:bg-surface2',
        variant === 'danger' && 'bg-peach/25 text-peach-ink hover:bg-peach/40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-ink hover:bg-surface2 transition focus-ring', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({ tone, children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        tone ? cx(TONE_SOFT[tone], TONE_INK[tone]) : 'bg-surface2 text-muted',
        className,
      )}
    >
      {typeof children === 'string' ? <span className="truncate">{children}</span> : children}
    </span>
  );
}

export function ProgressBar({ value, tone = 'lav', className }: { value: number; tone?: Tone; className?: string }) {
  const bg = { lav: 'bg-lav', mint: 'bg-mint', peach: 'bg-peach', butter: 'bg-butter', sky: 'bg-sky' }[tone];
  return (
    <div className={cx('h-2 rounded-full bg-surface2 overflow-hidden', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-all duration-700', bg)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 128, stroke = 12, color = '#6DD3B2', children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface2))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value / 100))}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cx('relative w-full bg-surface rounded-t-[26px] sm:rounded-[26px] shadow-lift border border-line animate-rise max-h-[92dvh] flex flex-col', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <IconButton label="Zatvori" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-6 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line flex justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputCls =
  'w-full h-10 rounded-xl bg-surface2 border border-transparent px-3 text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:border-lav focus:bg-surface transition';

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface2 gap-0.5" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition focus-ring',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, tone }: { title: string; subtitle?: string; actions?: React.ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          {tone && <span className={cx('w-2.5 h-2.5 rounded-full', { lav: 'bg-lav', mint: 'bg-mint', peach: 'bg-peach', butter: 'bg-butter', sky: 'bg-sky' }[tone])} />}
          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink text-balance">{title}</h1>
        </div>
        {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-surface2 grid place-items-center text-muted">{icon}</div>
      <p className="font-medium text-ink mt-1">{title}</p>
      {text && <p className="text-sm text-muted max-w-xs">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, tone = 'mint' }: { checked: boolean; onChange: () => void; label: string; tone?: 'mint' | 'lav' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cx(
        'grid place-items-center w-[22px] h-[22px] rounded-full border-2 shrink-0 transition-all focus-ring',
        checked ? (tone === 'mint' ? 'bg-mint border-mint' : 'bg-lav border-lav') : 'border-line hover:border-mint',
      )}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pop">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}

export function ConfirmDialog({ open, title, text, onConfirm, onClose }: { open: boolean; title: string; text: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Odustani</Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Obriši
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{text}</p>
    </Modal>
  );
}
