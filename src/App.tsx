import React, { useEffect, useState } from 'react';
import { Plus, PanelLeftClose, PanelLeftOpen, WifiOff, Ellipsis, Moon, Sun, Check, LayoutDashboard, SquareCheck, CalendarDays, StickyNote, X, Cloud, CloudOff, CircleAlert, RefreshCw } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './db';
import { AuthScreen, SetNewPassword } from './Auth';
import { StoreProvider, useOnline, useStore } from './store';
import { QuickProvider, useQuick } from './forms';
import { NAV, Route, go, isRoute } from './nav';
import { cx, TONE_INK, TONE_SOFT } from './utils';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Projects } from './pages/Projects';
import { Notes } from './pages/Notes';
import { Finance } from './pages/Finance';
import { Inbox } from './pages/Inbox';
import { WeeklyReview } from './pages/WeeklyReview';
import { Settings } from './pages/Settings';

function useRoute(): Route {
  const read = () => {
    const h = window.location.hash.replace('#', '');
    return isRoute(h) ? h : 'pocetna';
  };
  const [r, setR] = useState<Route>(read);
  useEffect(() => {
    const h = () => {
      setR(read());
      document.getElementById('main')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return r;
}

function useTheme() {
  const { data } = useStore();
  const pref = data.settings.theme;
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'tamna' || (pref === 'sustav' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}

function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative w-9 h-9 shrink-0 rounded-[12px] bg-ink grid grid-cols-2 gap-[3px] p-[7px]" aria-hidden>
        <span className="rounded-[3px] bg-lav" />
        <span className="rounded-[3px] bg-mint" />
        <span className="rounded-[3px] bg-peach" />
        <span className="rounded-[3px] bg-butter" />
      </div>
      {!small && (
        <div className="leading-tight min-w-0">
          <p className="font-bold text-[14px] tracking-[0.06em] text-ink">MY WORKSPACE</p>
          <p className="text-[11px] text-muted">Personal Work OS</p>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ compact }: { compact?: boolean }) {
  const { syncState, refresh } = useStore();
  const meta = {
    synced: { label: 'Sinkronizirano', icon: <Cloud size={12} />, cls: 'bg-mint/15 text-mint-ink' },
    saving: { label: 'Spremanje…', icon: <span className="w-1.5 h-1.5 rounded-full bg-butter animate-pulse" />, cls: 'bg-surface2 text-muted' },
    loading: { label: 'Učitavanje…', icon: <span className="w-1.5 h-1.5 rounded-full bg-sky animate-pulse" />, cls: 'bg-surface2 text-muted' },
    error: { label: 'Greška sinkronizacije', icon: <CircleAlert size={12} />, cls: 'bg-peach/25 text-peach-ink' },
    offline: { label: 'Izvan mreže', icon: <CloudOff size={12} />, cls: 'bg-peach/25 text-peach-ink' },
  }[syncState];
  return (
    <button
      type="button"
      onClick={() => syncState === 'error' && refresh()}
      className={cx('inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1', meta.cls, syncState !== 'error' && 'cursor-default')}
      title={syncState === 'error' ? 'Dodirni za ponovno učitavanje' : meta.label}
      aria-label={meta.label}
      aria-live="polite"
    >
      {meta.icon}
      {!compact && meta.label}
    </button>
  );
}

function Sidebar({ route, collapsed, onToggle }: { route: Route; collapsed: boolean; onToggle: () => void }) {
  const { data, setSettings } = useStore();
  const dark = data.settings.theme === 'tamna' || (data.settings.theme === 'sustav' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const inboxCount = data.inbox.length;
  return (
    <aside className={cx('hidden md:flex flex-col shrink-0 h-dvh sticky top-0 border-r border-line/80 bg-surface/70 backdrop-blur-xl transition-[width] duration-300', collapsed ? 'w-[76px]' : 'w-[248px]')}>
      <div className={cx('flex items-center h-[72px] px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <Logo small={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Glavna navigacija">
        <ul className="grid grid-cols-1 gap-0.5">
          {NAV.map((n, i) => {
            const active = route === n.route;
            const Icon = n.icon;
            return (
              <React.Fragment key={n.route}>
                {i === 2 && <li aria-hidden className={cx('mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/80', collapsed && 'sr-only')}>Moduli</li>}
                {i === 7 && <li aria-hidden className="my-2 mx-3 border-t border-line/80" />}
                <li>
                  <a
                    href={`#${n.route}`}
                    title={collapsed ? n.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'group flex items-center gap-3 h-10 rounded-xl text-[14px] font-medium transition focus-ring',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      active ? 'bg-ink text-bg shadow-sm' : 'text-ink/75 hover:text-ink hover:bg-surface2',
                    )}
                  >
                    <span className={cx('grid place-items-center w-7 h-7 rounded-lg shrink-0 transition', !active && n.tone && cx(TONE_SOFT[n.tone], TONE_INK[n.tone]))}>
                      <Icon size={16} strokeWidth={2.1} />
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
                    {!collapsed && n.route === 'ulazni' && inboxCount > 0 && (
                      <span className={cx('text-[11px] font-semibold rounded-full px-1.5 min-w-[20px] text-center', active ? 'bg-bg/20' : 'bg-lav/20 text-lav-ink')}>{inboxCount}</span>
                    )}
                  </a>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 grid gap-2 border-t border-line/80">
        {!collapsed && (
          <div className="flex items-center justify-between px-1">
            <SaveIndicator />
          </div>
        )}
        <div className={cx('flex items-center gap-1', collapsed ? 'flex-col' : 'justify-between')}>
          <button
            type="button"
            onClick={() => setSettings({ theme: dark ? 'svijetla' : 'tamna' })}
            className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-ink hover:bg-surface2 transition focus-ring"
            aria-label={dark ? 'Uključi svijetlu temu' : 'Uključi tamnu temu'}
            title={dark ? 'Svijetla tema' : 'Tamna tema'}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-ink hover:bg-surface2 transition focus-ring"
            aria-label={collapsed ? 'Proširi bočnu traku' : 'Suzi bočnu traku'}
            title={collapsed ? 'Proširi' : 'Suzi'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

const MOBILE_TABS: { route: Route; label: string; icon: React.ElementType }[] = [
  { route: 'pocetna', label: 'Početna', icon: LayoutDashboard },
  { route: 'zadaci', label: 'Zadaci', icon: SquareCheck },
  { route: 'kalendar', label: 'Kalendar', icon: CalendarDays },
  { route: 'biljeske', label: 'Bilješke', icon: StickyNote },
];

function MobileNav({ route }: { route: Route }) {
  const [more, setMore] = useState(false);
  const inMore = !MOBILE_TABS.some((t) => t.route === route);
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-line/80 pb-[env(safe-area-inset-bottom)]" aria-label="Glavna navigacija">
        <ul className="grid grid-cols-5 h-[62px]">
          {MOBILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = route === t.route;
            return (
              <li key={t.route}>
                <a href={`#${t.route}`} aria-current={active ? 'page' : undefined} className={cx('h-full flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition', active ? 'text-ink' : 'text-muted')}>
                  <span className={cx('grid place-items-center w-11 h-7 rounded-full transition', active && 'bg-lav/25')}>
                    <Icon size={19} strokeWidth={active ? 2.3 : 2} />
                  </span>
                  {t.label}
                </a>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore(true)} className={cx('w-full h-full flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium', inMore ? 'text-ink' : 'text-muted')} aria-haspopup="dialog">
              <span className={cx('grid place-items-center w-11 h-7 rounded-full', inMore && 'bg-lav/25')}>
                <Ellipsis size={19} />
              </span>
              Više
            </button>
          </li>
        </ul>
      </nav>
      {more && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Više">
          <div className="absolute inset-0 bg-ink/30 animate-fade" onClick={() => setMore(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-surface rounded-t-[26px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-rise">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="font-semibold text-ink">Svi moduli</p>
              <button type="button" aria-label="Zatvori" onClick={() => setMore(false)} className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:bg-surface2">
                <X size={18} />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.route}>
                    <a href={`#${n.route}`} onClick={() => setMore(false)} className={cx('flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-[12px] font-medium transition', route === n.route ? 'bg-ink text-bg' : 'bg-surface2/70 text-ink')}>
                      <span className={cx('grid place-items-center w-9 h-9 rounded-xl', route !== n.route && (n.tone ? cx(TONE_SOFT[n.tone], TONE_INK[n.tone]) : 'bg-surface'))}>
                        <Icon size={18} />
                      </span>
                      <span className="leading-tight">{n.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function QuickFab() {
  const { open } = useQuick();
  const [menu, setMenu] = useState(false);
  const items = [
    { k: 'task' as const, label: 'Zadatak', tone: 'mint' as const },
    { k: 'event' as const, label: 'Događaj', tone: 'sky' as const },
    { k: 'note' as const, label: 'Bilješka', tone: 'butter' as const },
    { k: 'txn' as const, label: 'Trošak', tone: 'peach' as const },
  ];
  return (
    <div className="fixed z-30 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 md:right-6 flex flex-col items-end gap-2">
      {menu && (
        <>
          <div className="fixed inset-0 -z-10" onClick={() => setMenu(false)} />
          {items.map((it, i) => (
            <button
              key={it.k}
              type="button"
              onClick={() => { setMenu(false); open(it.k); }}
              className={cx('h-10 pl-3 pr-4 rounded-full shadow-lift text-sm font-semibold text-ink inline-flex items-center gap-2 bg-surface border border-line animate-rise focus-ring')}
              style={{ animationDelay: `${(items.length - i) * 30}ms` }}
            >
              <span className={cx('w-6 h-6 rounded-full grid place-items-center', TONE_SOFT[it.tone], TONE_INK[it.tone])}>
                <Plus size={14} />
              </span>
              {it.label}
            </button>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-label={menu ? 'Zatvori brzo dodavanje' : 'Brzo dodavanje'}
        aria-expanded={menu}
        className="w-14 h-14 rounded-[20px] bg-ink text-bg shadow-lift grid place-items-center hover:scale-105 active:scale-95 transition focus-ring"
      >
        <Plus size={24} className={cx('transition-transform duration-300', menu && 'rotate-45')} />
      </button>
    </div>
  );
}

function Toast() {
  const { toastMsg } = useStore();
  if (!toastMsg) return null;
  const err = toastMsg.kind === 'error';
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 top-[calc(1rem+env(safe-area-inset-top))] md:top-auto md:bottom-6 w-[min(92vw,520px)] flex justify-center" role={err ? 'alert' : 'status'}>
      <div className={cx('flex items-center gap-2 text-sm font-medium rounded-2xl pl-3 pr-4 py-2.5 shadow-lift animate-rise', err ? 'bg-peach text-[#4A1F10]' : 'bg-ink text-bg')}>
        <span className={cx('grid place-items-center w-5 h-5 rounded-full shrink-0', err ? 'bg-white/60' : 'bg-mint text-[#14392D]')}>
          {err ? <CircleAlert size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
        </span>
        {toastMsg.msg}
      </div>
    </div>
  );
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-20 bg-peach text-[#4A1F10] text-sm font-medium px-4 py-2 flex items-center justify-center gap-2" role="alert">
      <WifiOff size={15} className="shrink-0" /> Izvan mreže. Vidiš zadnje učitane podatke, a izmjene su onemogućene dok se veza ne vrati.
    </div>
  );
}

function Shell() {
  useTheme();
  const route = useRoute();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('mw-sidebar');
      if (v) return v === '1';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' && window.innerWidth < 1200;
  });
  useEffect(() => {
    try {
      localStorage.setItem('mw-sidebar', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const page = {
    pocetna: <Dashboard />,
    ulazni: <Inbox />,
    zadaci: <Tasks />,
    kalendar: <Calendar />,
    projekti: <Projects />,
    biljeske: <Notes />,
    financije: <Finance />,
    'tjedni-pregled': <WeeklyReview />,
    postavke: <Settings />,
  }[route];
  const current = NAV.find((n) => n.route === route)!;
  const { loaded, loadError, refresh, data } = useStore();
  if (!loaded) return <Splash label="Učitavanje tvojih podataka…" />;
  if (loadError && !data.tasks.length && !data.projects.length && !data.notes.length && !data.txns.length)
    return (
      <Splash label={loadError}>
        <button type="button" onClick={() => refresh()} className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ink text-bg text-sm font-medium">
          <RefreshCw size={15} /> Pokušaj ponovno
        </button>
      </Splash>
    );

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <Sidebar route={route} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <OfflineBanner />
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-bg/85 backdrop-blur-xl border-b border-line/60 px-4 h-[calc(3.5rem+env(safe-area-inset-top))] flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <button type="button" onClick={() => go('pocetna')} aria-label="Početna" className="flex items-center gap-2">
            <Logo small />
            <span className="font-bold text-[15px] text-ink">{route === 'pocetna' ? 'My Workspace' : current.label}</span>
          </button>
          <SaveIndicator compact />
        </header>
        <main id="main" key={route} className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 xl:px-10 pt-5 md:pt-8 pb-[calc(140px+env(safe-area-inset-bottom))] md:pb-16 animate-page">
          {page}
        </main>
      </div>
      <MobileNav route={route} />
      <QuickFab />
      <Toast />
    </div>
  );
}

function Splash({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-[18px] bg-[#282633] grid grid-cols-2 gap-1 p-3 animate-pulse" aria-hidden>
          <span className="rounded bg-lav" />
          <span className="rounded bg-mint" />
          <span className="rounded bg-peach" />
          <span className="rounded bg-butter" />
        </div>
        <p className="mt-4 text-sm text-muted max-w-xs" role="status">{label}</p>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Splash label="Pokretanje…" />;
  if (recovery && session) return <SetNewPassword onDone={() => setRecovery(false)} />;
  if (!session) return <AuthScreen />;
  return (
    <StoreProvider key={session.user.id} session={session}>
      <QuickProvider>
        <Shell />
      </QuickProvider>
    </StoreProvider>
  );
}
