import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, Budget, CollectionKey, SettingsData, Task, Txn } from './types';
import { buildSampleData } from './data';
import { addDays, addMonths, fromISO, todayISO, uid } from './utils';
import {
  COLLECTION_BY_TABLE, deleteAllMine, deleteItem, fetchAll, fetchCollection, fromRow, hrError, insertMany, saveBudgets,
  saveItem, saveSettings, stableUuid, supabase,
} from './db';

/**
 * Online-first store backed by Supabase.
 * - Every change is applied to the screen immediately, then written to the database.
 * - If the write fails, the affected list is reloaded from the database and an error is shown.
 * - Changes made on other devices arrive through Supabase Realtime.
 * - While offline, changes are refused (no offline editing / conflict resolution in v1).
 */

type Item<K extends CollectionKey> = AppData[K][number];
export type SyncState = 'synced' | 'saving' | 'error' | 'offline' | 'loading';
export type RealtimeState = 'connecting' | 'live' | 'down';
export type ToastKind = 'ok' | 'error';

const EMPTY: AppData = {
  version: 1, tasks: [], events: [], projects: [], notes: [], txns: [], budgets: [], goals: [], inbox: [],
  settings: { name: '', email: '', theme: 'svijetla', weekStartsMonday: true },
};

interface Store {
  data: AppData;
  session: Session;
  syncState: SyncState;
  realtime: RealtimeState;
  lastSynced: Date | null;
  loaded: boolean;
  loadError: string | null;
  upsert: <K extends CollectionKey>(key: K, item: Item<K>) => void;
  remove: (key: CollectionKey, id: string) => void;
  toggleTask: (id: string) => void;
  setBudgets: (b: Budget[]) => void;
  setSettings: (s: Partial<SettingsData>) => void;
  loadSample: () => Promise<void>;
  deleteAll: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  toast: (msg: string, kind?: ToastKind) => void;
  toastMsg: { msg: string; kind: ToastKind } | null;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const userId = session.user.id;
  const [data, setData] = useState<AppData>(() => ({ ...EMPTY, settings: { ...EMPTY.settings, email: session.user.email ?? '' } }));
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [hadError, setHadError] = useState(false);
  const [realtime, setRealtime] = useState<RealtimeState>('connecting');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const online = useOnline();
  const dataRef = useRef(data);
  dataRef.current = data;
  const recentWrites = useRef(new Map<string, number>());
  const toastTimer = useRef<number>();
  const lastFetch = useRef(0);
  const settingsTimer = useRef<number>();

  const lastErrorAt = useRef(0);
  const toast = useCallback((msg: string, kind: ToastKind = 'ok') => {
    // A success message right after a refused change must not hide the error.
    if (kind === 'error') lastErrorAt.current = Date.now();
    else if (Date.now() - lastErrorAt.current < 1500) return;
    setToastMsg({ msg, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), kind === 'error' ? 5000 : 2600);
  }, []);

  /* ── loading ── */
  const refresh = useCallback(async () => {
    try {
      const all = await fetchAll();
      setData((d) => ({ ...d, ...all, settings: { ...all.settings, email: session.user.email ?? '' } }));
      setLoadError(null);
      setHadError(false);
      setLastSynced(new Date());
      lastFetch.current = Date.now();
    } catch (e) {
      setLoadError(hrError((e as Error).message));
    } finally {
      setLoaded(true);
    }
  }, [session.user.email]);

  useEffect(() => {
    refresh().then(() => bookRecurring());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload when coming back online or returning to the app after a while (covers missed realtime events).
  useEffect(() => {
    if (online && loaded) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastFetch.current > 60_000) refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  /* ── realtime ── */
  useEffect(() => {
    const ch = supabase.channel(`user-${userId}`);
    for (const table of ['tasks', 'events', 'projects', 'notes', 'transactions', 'goals', 'inbox_items', 'budgets', 'settings']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
        const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
        const id: string | undefined = row?.id ?? payload.old?.id;
        if (id && (recentWrites.current.get(id) ?? 0) > Date.now() - 4000) return; // our own echo
        if (table === 'budgets') {
          supabase.from('budgets').select('*').then(({ data: b }) => b && setData((d) => ({ ...d, budgets: b.map((x: any) => ({ category: x.category, limit: Number(x.monthly_limit) })) })));
          return;
        }
        if (table === 'settings') {
          if (row && row.user_id === userId) setData((d) => ({ ...d, settings: { ...d.settings, name: row.name, theme: row.theme } }));
          return;
        }
        const key = COLLECTION_BY_TABLE[table];
        setData((d) => {
          const list = d[key] as { id: string }[];
          if (payload.eventType === 'DELETE') return { ...d, [key]: list.filter((x) => x.id !== id) };
          if (!row || (row.user_id && row.user_id !== userId)) return d;
          const item = (fromRow as any)[key](row);
          const exists = list.some((x) => x.id === item.id);
          return { ...d, [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list] };
        });
        setLastSynced(new Date());
      });
    }
    ch.subscribe((status) => setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'down' : 'connecting'));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  /* ── write helper ── */
  const write = useCallback(
    async (ids: string[], op: () => Promise<void>, rollback: () => Promise<void> | void) => {
      const now = Date.now();
      ids.forEach((id) => recentWrites.current.set(id, now));
      setPending((p) => p + 1);
      try {
        await op();
        setLastSynced(new Date());
        setHadError(false);
      } catch (e) {
        setHadError(true);
        toast(`Nije spremljeno: ${hrError((e as Error).message)}`, 'error');
        try {
          await rollback();
        } catch {
          /* reload failed too; the error state stays visible */
        }
      } finally {
        ids.forEach((id) => recentWrites.current.set(id, Date.now()));
        setPending((p) => p - 1);
      }
    },
    [toast],
  );

  const guardOnline = useCallback(() => {
    if (!navigator.onLine) {
      toast('Izvan mreže: promjena nije spremljena. Pokušaj kad se veza vrati.', 'error');
      return false;
    }
    return true;
  }, [toast]);

  const reloadKey = useCallback(async (key: CollectionKey) => {
    const items = await fetchCollection(key);
    setData((d) => ({ ...d, [key]: items }));
  }, []);

  /* ── actions ── */
  const upsert = useCallback(
    <K extends CollectionKey>(key: K, item: Item<K>) => {
      if (!guardOnline()) return;
      setData((d) => {
        const list = d[key] as Item<K>[];
        const exists = list.some((x) => x.id === item.id);
        return { ...d, [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list] };
      });
      void write([item.id], () => saveItem(key, item), () => reloadKey(key));
    },
    [guardOnline, write, reloadKey],
  );

  const remove = useCallback(
    (key: CollectionKey, id: string) => {
      if (!guardOnline()) return;
      setData((d) => {
        const next: AppData = { ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) };
        // Mirror the database's ON DELETE SET NULL locally.
        if (key === 'projects') {
          next.tasks = d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t));
          next.notes = d.notes.map((x) => (x.projectId === id ? { ...x, projectId: undefined } : x));
        }
        if (key === 'tasks') next.events = d.events.map((e) => (e.taskId === id ? { ...e, taskId: undefined } : e));
        return next;
      });
      void write([id], () => deleteItem(key, id), () => refresh());
    },
    [guardOnline, write, refresh],
  );

  const toggleTask = useCallback(
    (id: string) => {
      if (!guardOnline()) return;
      const task = dataRef.current.tasks.find((x) => x.id === id);
      if (!task) return;
      const done = !task.done;
      const updated: Task = { ...task, done, completedAt: done ? todayISO() : undefined };
      let next: Task | null = null;
      if (done && task.recurring) {
        const base = task.due ?? todayISO();
        const due = task.recurring === 'dnevno' ? addDays(base, 1) : task.recurring === 'tjedno' ? addDays(base, 7) : addMonths(base, 1);
        next = { ...task, id: uid(), done: false, completedAt: undefined, todayFocus: false, due, createdAt: todayISO(), subtasks: task.subtasks.map((s) => ({ ...s, id: uid(), done: false })) };
      }
      setData((d) => ({ ...d, tasks: [...(next ? [next] : []), ...d.tasks.map((x) => (x.id === id ? updated : x))] }));
      void write(
        next ? [id, next.id] : [id],
        async () => {
          await saveItem('tasks', updated);
          if (next) await saveItem('tasks', next);
        },
        () => reloadKey('tasks'),
      );
    },
    [guardOnline, write, reloadKey],
  );

  const setBudgets = useCallback(
    (budgets: Budget[]) => {
      if (!guardOnline()) return;
      setData((d) => ({ ...d, budgets }));
      void write([], () => saveBudgets(budgets), () => refresh());
    },
    [guardOnline, write, refresh],
  );

  const setSettings = useCallback(
    (s: Partial<SettingsData>) => {
      setData((d) => ({ ...d, settings: { ...d.settings, ...s } }));
      if (!navigator.onLine) return; // theme still applies on this device
      window.clearTimeout(settingsTimer.current);
      settingsTimer.current = window.setTimeout(() => {
        void write([], () => saveSettings(userId, { name: dataRef.current.settings.name, theme: dataRef.current.settings.theme }), () => {});
      }, 500);
    },
    [userId, write],
  );

  /** Books this month's occurrence of each monthly recurring transaction (once per item per month, on any device). */
  const bookRecurring = useCallback(async () => {
    const txns = dataRef.current.txns;
    if (!txns.length || !navigator.onLine) return;
    const today = todayISO();
    const month = today.slice(0, 7);
    const latest = new Map<string, Txn>();
    for (const t of txns.filter((x) => x.recurring)) {
      const k = `${t.type}|${t.category}|${t.description}`;
      const cur = latest.get(k);
      if (!cur || t.date > cur.date) latest.set(k, t);
    }
    const toBook: Txn[] = [];
    for (const [k, t] of latest) {
      if (t.date.slice(0, 7) >= month) continue;
      const day = fromISO(t.date).getDate();
      const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
      const date = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
      if (date > today) continue;
      toBook.push({ ...t, id: await stableUuid(`${userId}|${k}|${month}`), date });
    }
    if (!toBook.length) return;
    try {
      await insertMany('txns', toBook, true);
      await reloadKey('txns');
      toast(`Proknjiženo ponavljajućih stavki: ${toBook.length}`);
    } catch (e) {
      toast(`Ponavljajuće stavke nisu proknjižene: ${hrError((e as Error).message)}`, 'error');
    }
  }, [userId, reloadKey, toast]);

  const loadSample = useCallback(async () => {
    if (!guardOnline()) return;
    const s = buildSampleData();
    const map = new Map<string, string>();
    const re = (id?: string) => {
      if (!id) return undefined;
      if (!map.has(id)) map.set(id, uid());
      return map.get(id)!;
    };
    setPending((p) => p + 1);
    try {
      await insertMany('projects', s.projects.map((p) => ({ ...p, id: re(p.id)! })));
      await insertMany('tasks', s.tasks.map((t) => ({ ...t, id: re(t.id)!, projectId: re(t.projectId), subtasks: t.subtasks.map((x) => ({ ...x, id: uid() })) })));
      await insertMany('events', s.events.map((e) => ({ ...e, id: re(e.id)!, taskId: re(e.taskId) })));
      await insertMany('notes', s.notes.map((x) => ({ ...x, id: re(x.id)!, projectId: re(x.projectId) })));
      await insertMany('txns', s.txns.map((t) => ({ ...t, id: uid() })));
      await insertMany('goals', s.goals.map((g) => ({ ...g, id: uid() })));
      await insertMany('inbox', s.inbox.map((i) => ({ ...i, id: uid() })));
      await saveBudgets(s.budgets);
      await refresh();
      toast('Primjeri su učitani');
    } catch (e) {
      toast(`Primjeri nisu učitani: ${hrError((e as Error).message)}`, 'error');
      await refresh();
    } finally {
      setPending((p) => p - 1);
    }
  }, [guardOnline, refresh, toast]);

  const deleteAll = useCallback(async () => {
    if (!guardOnline()) return;
    setPending((p) => p + 1);
    try {
      await deleteAllMine(userId);
      await refresh();
      toast('Svi tvoji podaci su obrisani');
    } catch (e) {
      toast(`Brisanje nije uspjelo: ${hrError((e as Error).message)}`, 'error');
      await refresh();
    } finally {
      setPending((p) => p - 1);
    }
  }, [guardOnline, userId, refresh, toast]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const syncState: SyncState = !loaded ? 'loading' : !online ? 'offline' : pending > 0 ? 'saving' : hadError || loadError ? 'error' : 'synced';

  const value = useMemo(
    () => ({
      data, session, syncState, realtime, lastSynced, loaded, loadError, upsert, remove, toggleTask, setBudgets, setSettings,
      loadSample, deleteAll, refresh, signOut, toast, toastMsg,
    }),
    [data, session, syncState, realtime, lastSynced, loaded, loadError, upsert, remove, toggleTask, setBudgets, setSettings, loadSample, deleteAll, refresh, signOut, toast, toastMsg],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
