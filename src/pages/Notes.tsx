import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Search, Pin, PinOff, Trash2, Bold, Italic, List, ListOrdered, Heading2, ChevronLeft, Tag, Folder, StickyNote, Check, X,
  Lock, LockOpen, Briefcase, ChevronDown, SquareCheck, FolderPlus,
} from 'lucide-react';
import { useStore } from '../store';
import { useQuick } from '../forms';
import { Button, Card, Chip, ConfirmDialog, Empty, IconButton, PageHeader, Segmented, inputCls } from '../ui';
import type { Note, NoteSpace } from '../types';
import { PRIVATE_FOLDERS, WORK_FOLDERS } from '../data';
import { cx, fmtDate, fmtDateTime, stripHtml, todayISO, uid } from '../utils';

/** Private notes stay hidden until unlocked; the lock resets on reload and when the app goes to the background. */
let privateUnlocked = false;

const TEMPLATES: { id: string; label: string; folder: string; title: () => string; html: () => string }[] = [
  { id: 'prazna', label: 'Prazna bilješka', folder: '', title: () => '', html: () => '' },
  {
    id: 'sastanak', label: 'Zapisnik sastanka', folder: 'Sastanci', title: () => `Sastanak ${fmtDate(todayISO())}`,
    html: () => `<p><b>Datum:</b> ${fmtDate(todayISO())}<br><b>Sudionici:</b> </p><h2>Teme</h2><ul><li></li></ul><h2>Dogovoreno</h2><ul><li></li></ul><h2>Zadaci</h2><ol><li>Tko · što · do kada</li></ol>`,
  },
  {
    id: 'brief', label: 'Projektni brief', folder: 'Projekti', title: () => 'Brief: ',
    html: () => `<h2>Cilj</h2><p></p><h2>Opseg</h2><ul><li>Uključeno: </li><li>Nije uključeno: </li></ul><h2>Rokovi</h2><p>Početak: <br>Završetak: </p><h2>Rizici i otvorena pitanja</h2><ul><li></li></ul>`,
  },
  {
    id: 'dnevnik', label: 'Radni dnevnik', folder: 'Projekti', title: () => `Dnevnik ${fmtDate(todayISO())}`,
    html: () => `<h2>Danas napravljeno</h2><ul><li></li></ul><h2>Blokirano / čeka se</h2><ul><li></li></ul><h2>Sutra</h2><ul><li></li></ul>`,
  },
  {
    id: 'klijent', label: 'Klijent / partner', folder: 'Klijenti', title: () => 'Klijent: ',
    html: () => `<p><b>Kontakt osoba:</b> <br><b>Telefon:</b> <br><b>E-pošta:</b> </p><h2>Dogovori</h2><ul><li></li></ul><h2>Povijest komunikacije</h2><p>${fmtDate(todayISO())} – </p>`,
  },
  {
    id: 'procedura', label: 'Procedura / postupak', folder: 'Procedure', title: () => 'Postupak: ',
    html: () => `<h2>Kada se koristi</h2><p></p><h2>Koraci</h2><ol><li></li></ol><h2>Napomene</h2><p></p>`,
  },
];

export function Notes() {
  const { data, upsert, remove, toast } = useStore();
  const [space, setSpace] = useState<NoteSpace>('posao');
  const [unlocked, setUnlocked] = useState(privateUnlocked);
  const [folder, setFolder] = useState<string>('');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [tplOpen, setTplOpen] = useState(false);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      const id = sessionStorage.getItem('mw-open-note');
      sessionStorage.removeItem('mw-open-note');
      if (id) return id;
    } catch {
      /* ignore */
    }
    return null;
  });

  // Re-lock private notes when the app goes to the background.
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === 'hidden') {
        privateUnlocked = false;
        setUnlocked(false);
      }
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // Opening a note from elsewhere switches to its space.
  useEffect(() => {
    const n = data.notes.find((x) => x.id === selected);
    if (n && n.space !== space) setSpace(n.space);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locked = space === 'privatno' && !unlocked;
  const inSpace = useMemo(() => data.notes.filter((n) => n.space === space), [data.notes, space]);
  const folders = useMemo(
    () => Array.from(new Set([...(space === 'posao' ? WORK_FOLDERS : PRIVATE_FOLDERS), ...inSpace.map((n) => n.folder), ...(folder ? [folder] : [])])),
    [space, inSpace, folder],
  );
  const allTags = useMemo(() => Array.from(new Set(inSpace.flatMap((n) => n.tags))).sort(), [inSpace]);
  const list = useMemo(() => {
    let l = inSpace;
    if (folder) l = l.filter((n) => n.folder === folder);
    if (tag) l = l.filter((n) => n.tags.includes(tag));
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((n) => n.title.toLowerCase().includes(s) || stripHtml(n.html).toLowerCase().includes(s) || n.tags.some((t) => t.includes(s)));
    }
    return [...l].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [inSpace, folder, tag, q]);

  useEffect(() => {
    if (!selected && !locked && typeof window !== 'undefined' && window.innerWidth >= 1024 && list[0]) setSelected(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, locked]);

  const note = data.notes.find((n) => n.id === selected && n.space === space);

  const switchSpace = (s: NoteSpace) => {
    setSpace(s);
    setFolder('');
    setTag('');
    setSelected(null);
  };
  const unlock = () => {
    privateUnlocked = true;
    setUnlocked(true);
  };
  const lock = () => {
    privateUnlocked = false;
    setUnlocked(false);
    setSelected(null);
  };

  const create = (tplId = 'prazna', inFolder?: string) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId)!;
    const defaultFolder = space === 'posao' ? 'Projekti' : 'Osobno';
    const n: Note = {
      id: uid(), title: tpl.title(), html: tpl.html(), space,
      folder: inFolder || folder || tpl.folder || defaultFolder,
      tags: [], pinned: false, updatedAt: new Date().toISOString(),
    };
    upsert('notes', n);
    setSelected(n.id);
    setTplOpen(false);
  };

  return (
    <div>
      <PageHeader
        tone="butter"
        title="Bilješke"
        subtitle={space === 'posao' ? `${inSpace.length} poslovnih bilješki` : unlocked ? `${inSpace.length} privatnih bilješki` : 'Privatni prostor je zaključan'}
        actions={
          <>
            <Segmented<NoteSpace>
              label="Prostor"
              value={space}
              onChange={switchSpace}
              options={[
                { value: 'posao', label: 'Posao', icon: <Briefcase size={14} /> },
                { value: 'privatno', label: 'Privatno', icon: unlocked ? <LockOpen size={14} /> : <Lock size={14} /> },
              ]}
            />
            {!locked && (
              <div className="relative">
                <div className="flex">
                  <Button variant="primary" className="rounded-r-none" onClick={() => create()}>
                    <Plus size={16} /> Nova
                  </Button>
                  {space === 'posao' && (
                    <Button variant="primary" className="rounded-l-none border-l border-bg/20 px-2.5" aria-label="Nova iz predloška" aria-expanded={tplOpen} onClick={() => setTplOpen((o) => !o)}>
                      <ChevronDown size={16} />
                    </Button>
                  )}
                </div>
                {tplOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setTplOpen(false)} />
                    <div className="absolute right-0 mt-2 z-40 w-60 rounded-2xl bg-surface border border-line shadow-lift p-1.5 animate-rise" role="menu">
                      <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Predlošci</p>
                      {TEMPLATES.map((t) => (
                        <button key={t.id} type="button" role="menuitem" onClick={() => create(t.id)} className="w-full text-left px-3 py-2 rounded-xl text-sm text-ink hover:bg-surface2 transition">
                          {t.label}
                          {t.folder && <span className="block text-[11px] text-muted">u mapu {t.folder}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        }
      />

      {locked ? (
        <Card className="max-w-xl mx-auto">
          <div className="flex flex-col items-center text-center py-8 px-4">
            <span className="grid place-items-center w-14 h-14 rounded-2xl bg-butter/30 text-butter-ink">
              <Lock size={24} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Privatne bilješke su skrivene</h2>
            <p className="mt-1 text-sm text-muted max-w-sm">
              {inSpace.length ? `${inSpace.length} ${inSpace.length === 1 ? 'bilješka' : 'bilješki'}.` : 'Još nema privatnih bilješki.'} Ne prikazuju se na nadzornoj ploči, u projektima ni u pretrazi poslovnih bilješki. Ponovno se zaključaju kad napustiš aplikaciju.
            </p>
            <Button variant="primary" className="mt-5" onClick={unlock}>
              <LockOpen size={15} /> Prikaži privatne bilješke
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          <Card className={cx('!p-3 md:!p-4', note && 'hidden lg:block')}>
            {space === 'privatno' && (
              <button type="button" onClick={lock} className="mb-3 w-full flex items-center justify-center gap-1.5 h-9 rounded-xl bg-butter/20 text-butter-ink text-[13px] font-medium hover:bg-butter/30 transition focus-ring">
                <Lock size={14} /> Zaključaj privatno
              </button>
            )}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="note-search" aria-label="Pretraži bilješke" className={cx(inputCls, 'pl-9')} placeholder={space === 'posao' ? 'Pretraži poslovne bilješke' : 'Pretraži privatne bilješke'} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
              {['', ...folders].map((f) => (
                <button key={f || 'sve'} type="button" onClick={() => setFolder(f)} className={cx('h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition focus-ring', folder === f ? 'bg-butter/40 text-butter-ink' : 'bg-surface2 text-muted hover:text-ink')}>
                  {f || 'Sve mape'}
                  {f && <span className="ml-1 opacity-60 tabular-nums">{inSpace.filter((n) => n.folder === f).length}</span>}
                </button>
              ))}
              {newFolder === null ? (
                <button type="button" onClick={() => setNewFolder('')} className="h-8 px-2.5 rounded-lg text-[13px] text-muted hover:text-ink bg-surface2 whitespace-nowrap inline-flex items-center gap-1 focus-ring" aria-label="Nova mapa">
                  <FolderPlus size={14} /> Mapa
                </button>
              ) : (
                <form
                  className="flex"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = (newFolder ?? '').trim();
                    if (name) {
                      setFolder(name);
                      create('prazna', name);
                      toast(`Mapa „${name}" je kreirana`);
                    }
                    setNewFolder(null);
                  }}
                >
                  <label htmlFor="new-folder" className="sr-only">Naziv nove mape</label>
                  <input id="new-folder" autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onBlur={() => !newFolder && setNewFolder(null)} placeholder="Naziv mape" className="h-8 w-32 rounded-lg bg-surface2 px-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-butter" />
                </form>
              )}
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {allTags.map((t) => (
                  <button key={t} type="button" onClick={() => setTag(tag === t ? '' : t)} className={cx('text-[11px] font-medium rounded-full px-2 py-0.5 transition focus-ring', tag === t ? 'bg-ink text-bg' : 'bg-surface2 text-muted hover:text-ink')}>
                    #{t}
                  </button>
                ))}
              </div>
            )}
            <ul className="grid grid-cols-1 gap-1.5 max-h-[62vh] overflow-y-auto -mx-1 px-1">
              {list.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => setSelected(n.id)} className={cx('w-full text-left rounded-2xl p-3 transition focus-ring', selected === n.id ? 'bg-butter/30' : 'hover:bg-surface2/70')}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-ink truncate flex-1">{n.title || 'Bez naslova'}</p>
                      {n.pinned && <Pin size={12} className="text-butter-ink shrink-0" />}
                    </div>
                    <p className="text-xs text-muted line-clamp-2 mt-1">{stripHtml(n.html) || 'Prazna bilješka'}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
                      <span>{n.folder}</span>·<span>{fmtDateTime(n.updatedAt)}</span>
                    </div>
                  </button>
                </li>
              ))}
              {!list.length && <Empty icon={<StickyNote size={20} />} title="Nema bilješki" text={space === 'posao' ? 'Kreiraj novu ili odaberi predložak (strelica pored „Nova").' : 'Kreiraj prvu privatnu bilješku.'} />}
            </ul>
          </Card>

          {note ? (
            <Editor key={note.id} note={note} folders={folders} onBack={() => setSelected(null)} onSave={(n) => upsert('notes', n)} onDelete={() => { remove('notes', note.id); setSelected(null); toast('Bilješka je obrisana'); }} />
          ) : (
            <Card className="hidden lg:block">
              <Empty icon={<StickyNote size={20} />} title="Odaberi bilješku" text="Ili kreiraj novu. Promjene se spremaju automatski." />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Editor({ note, folders, onSave, onDelete, onBack }: { note: Note; folders: string[]; onSave: (n: Note) => void; onDelete: () => void; onBack: () => void }) {
  const { data } = useStore();
  const { open } = useQuick();
  const ref = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<'spremljeno' | 'spremanje'>('spremljeno');
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  const [tagInput, setTagInput] = useState('');
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<number>();
  const latest = useRef(note);
  latest.current = note;
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = note.html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (patch: Partial<Note>) => {
    const now = new Date().toISOString();
    onSave({ ...latest.current, title: titleRef.current, html: ref.current?.innerHTML ?? latest.current.html, ...patch, updatedAt: now });
    setSavedAt(now);
    setStatus('spremljeno');
  };
  const schedule = (patch: Partial<Note>) => {
    setStatus('spremanje');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(patch), 700);
  };
  const immediate = (patch: Partial<Note>) => {
    window.clearTimeout(timer.current);
    commit(patch);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cmd = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    schedule({});
  };
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !note.tags.includes(t)) immediate({ tags: [...note.tags, t] });
    setTagInput('');
  };
  const taskFromSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    open('task', {
      title: (sel || '').slice(0, 300),
      notes: `Iz bilješke: ${titleRef.current || 'Bez naslova'}`,
      projectId: note.space === 'posao' ? note.projectId : undefined,
      category: note.space === 'posao' ? 'Posao' : 'Osobno',
    });
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-1 px-3 md:px-4 py-2 border-b border-line flex-wrap">
        <IconButton label="Natrag na popis" className="lg:hidden" onClick={onBack}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Oblikovanje">
          <IconButton label="Naslov" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('formatBlock', 'h2')}>
            <Heading2 size={16} />
          </IconButton>
          <IconButton label="Podebljano" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')}>
            <Bold size={16} />
          </IconButton>
          <IconButton label="Kurziv" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')}>
            <Italic size={16} />
          </IconButton>
          <IconButton label="Popis" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertUnorderedList')}>
            <List size={16} />
          </IconButton>
          <IconButton label="Numerirani popis" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertOrderedList')}>
            <ListOrdered size={16} />
          </IconButton>
          <span className="w-px h-5 bg-line mx-1" aria-hidden />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={taskFromSelection} title="Označi tekst pa pretvori u zadatak" className="h-9 px-2.5 rounded-xl text-[13px] font-medium text-muted hover:text-ink hover:bg-surface2 inline-flex items-center gap-1.5 transition focus-ring">
            <SquareCheck size={15} /> <span className="hidden sm:inline">U zadatak</span>
          </button>
        </div>
        <span className="ml-auto text-xs text-muted inline-flex items-center gap-1 pr-1" aria-live="polite">
          {status === 'spremanje' ? 'Spremanje…' : (<><Check size={12} className="text-mint-ink" /> Spremljeno {fmtDateTime(savedAt).split(' u ')[1]}</>)}
        </span>
        <IconButton label={note.pinned ? 'Otkvači' : 'Prikvači'} onClick={() => immediate({ pinned: !note.pinned })}>
          {note.pinned ? <PinOff size={16} /> : <Pin size={16} />}
        </IconButton>
        <IconButton label="Obriši bilješku" onClick={() => setConfirm(true)}>
          <Trash2 size={16} />
        </IconButton>
      </div>
      <div className="px-5 md:px-8 pt-6 pb-8">
        <label htmlFor="note-title" className="sr-only">Naslov bilješke</label>
        <input
          id="note-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; schedule({}); }}
          placeholder="Naslov"
          className="w-full bg-transparent text-2xl md:text-[28px] font-bold tracking-tight text-ink placeholder:text-muted/50 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="inline-flex items-center gap-1 text-muted">
            <Folder size={12} />
            <label htmlFor="note-folder" className="sr-only">Mapa</label>
            <select id="note-folder" value={note.folder} onChange={(e) => immediate({ folder: e.target.value })} className="bg-surface2 rounded-lg h-7 px-1.5 text-ink focus:outline-none">
              {Array.from(new Set([...folders, note.folder])).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </span>
          <span className="inline-flex items-center gap-1 text-muted">
            <label htmlFor="note-space" className="sr-only">Prostor</label>
            <select
              id="note-space"
              value={note.space}
              onChange={(e) => {
                const sp = e.target.value as NoteSpace;
                immediate({ space: sp, folder: sp === 'posao' ? 'Projekti' : 'Osobno', projectId: sp === 'privatno' ? undefined : note.projectId });
              }}
              className="bg-surface2 rounded-lg h-7 px-1.5 text-ink focus:outline-none"
            >
              <option value="posao">Posao</option>
              <option value="privatno">Privatno</option>
            </select>
          </span>
          {note.space === 'posao' && (
            <span className="inline-flex items-center gap-1 text-muted">
              <label htmlFor="note-project" className="sr-only">Projekt</label>
              <select id="note-project" value={note.projectId ?? ''} onChange={(e) => immediate({ projectId: e.target.value || undefined })} className="bg-surface2 rounded-lg h-7 px-1.5 text-ink focus:outline-none max-w-[180px]">
                <option value="">Bez projekta</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </span>
          )}
          {note.tags.map((t) => (
            <Chip key={t} tone="butter">
              #{t}
              <button type="button" aria-label={`Ukloni oznaku ${t}`} onClick={() => immediate({ tags: note.tags.filter((x) => x !== t) })} className="hover:opacity-70">
                <X size={11} />
              </button>
            </Chip>
          ))}
          <span className="inline-flex items-center gap-1 text-muted">
            <Tag size={12} />
            <label htmlFor="note-tag" className="sr-only">Nova oznaka</label>
            <input id="note-tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} onBlur={addTag} placeholder="Dodaj oznaku" className="bg-transparent w-24 focus:outline-none text-ink placeholder:text-muted/70" />
          </span>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Sadržaj bilješke"
          onInput={() => schedule({})}
          onBlur={() => status === 'spremanje' && immediate({})}
          data-placeholder="Počni pisati…"
          className="note-body mt-6 min-h-[320px] focus:outline-none text-[15px] leading-relaxed text-ink max-w-[72ch]"
        />
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Obrisati bilješku?" text={`„${note.title || 'Bez naslova'}" bit će trajno uklonjena.`} onConfirm={onDelete} />
    </Card>
  );
}
