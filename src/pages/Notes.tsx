import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Pin, PinOff, Trash2, Bold, Italic, List, ListOrdered, Heading2, ChevronLeft, Tag, Folder, StickyNote, Check, X } from 'lucide-react';
import { useStore } from '../store';
import { Button, Card, Chip, ConfirmDialog, Empty, IconButton, PageHeader, inputCls } from '../ui';
import type { Note } from '../types';
import { NOTE_FOLDERS } from '../data';
import { cx, fmtDateTime, stripHtml, uid } from '../utils';

export function Notes() {
  const { data, upsert, remove, toast } = useStore();
  const [folder, setFolder] = useState<string>('');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      const id = sessionStorage.getItem('mw-open-note');
      sessionStorage.removeItem('mw-open-note');
      if (id) return id;
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? data.notes[0]?.id ?? null : null;
  });

  const allTags = useMemo(() => Array.from(new Set(data.notes.flatMap((n) => n.tags))).sort(), [data.notes]);
  const list = useMemo(() => {
    let l = data.notes;
    if (folder) l = l.filter((n) => n.folder === folder);
    if (tag) l = l.filter((n) => n.tags.includes(tag));
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((n) => n.title.toLowerCase().includes(s) || stripHtml(n.html).toLowerCase().includes(s) || n.tags.some((t) => t.includes(s)));
    }
    return [...l].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.notes, folder, tag, q]);

  const note = data.notes.find((n) => n.id === selected);

  const create = () => {
    const n: Note = { id: uid(), title: '', html: '', folder: folder || 'Osobno', tags: [], pinned: false, updatedAt: new Date().toISOString() };
    upsert('notes', n);
    setSelected(n.id);
  };

  return (
    <div>
      <PageHeader
        tone="butter"
        title="Bilješke"
        subtitle={`${data.notes.length} bilješki · ${data.notes.filter((n) => n.pinned).length} prikvačeno`}
        actions={
          <Button variant="primary" onClick={create}>
            <Plus size={16} /> Nova bilješka
          </Button>
        }
      />
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* List */}
        <Card className={cx('!p-3 md:!p-4', note && 'hidden lg:block')}>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="note-search" aria-label="Pretraži bilješke" className={cx(inputCls, 'pl-9')} placeholder="Pretraži naslove, tekst i oznake" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {['', ...NOTE_FOLDERS].map((f) => (
              <button key={f || 'sve'} type="button" onClick={() => setFolder(f)} className={cx('h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition focus-ring', folder === f ? 'bg-butter/40 text-butter-ink' : 'bg-surface2 text-muted hover:text-ink')}>
                {f || 'Sve mape'}
              </button>
            ))}
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
            {!list.length && <Empty icon={<StickyNote size={20} />} title="Nema bilješki" text="Promijeni filtre ili kreiraj novu." />}
          </ul>
        </Card>

        {/* Editor */}
        {note ? (
          <Editor key={note.id} note={note} onBack={() => setSelected(null)} onSave={(n) => upsert('notes', n)} onDelete={() => { remove('notes', note.id); setSelected(null); toast('Bilješka je obrisana'); }} />
        ) : (
          <Card className="hidden lg:block">
            <Empty icon={<StickyNote size={20} />} title="Odaberi bilješku" text="Ili kreiraj novu. Promjene se spremaju automatski." />
          </Card>
        )}
      </div>
    </div>
  );
}

function Editor({ note, onSave, onDelete, onBack }: { note: Note; onSave: (n: Note) => void; onDelete: () => void; onBack: () => void }) {
  const { data } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<'spremljeno' | 'spremanje'>('spremljeno');
  const [savedAt, setSavedAt] = useState(note.updatedAt);
  const [tagInput, setTagInput] = useState('');
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<number>();
  const latest = useRef(note);
  latest.current = note;

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = note.html;
    // only on mount (keyed by note id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedule = (patch: Partial<Note>) => {
    setStatus('spremanje');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const now = new Date().toISOString();
      onSave({ ...latest.current, title, html: ref.current?.innerHTML ?? latest.current.html, ...patch, updatedAt: now });
      setSavedAt(now);
      setStatus('spremljeno');
    }, 600);
  };
  const immediate = (patch: Partial<Note>) => {
    const now = new Date().toISOString();
    onSave({ ...latest.current, title, html: ref.current?.innerHTML ?? latest.current.html, ...patch, updatedAt: now });
    setSavedAt(now);
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
        <label htmlFor="note-title" className="sr-only">
          Naslov bilješke
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); schedule({ title: e.target.value }); }}
          placeholder="Naslov"
          className="w-full bg-transparent text-2xl md:text-[28px] font-bold tracking-tight text-ink placeholder:text-muted/50 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="inline-flex items-center gap-1 text-muted">
            <Folder size={12} />
            <label htmlFor="note-folder" className="sr-only">Mapa</label>
            <select id="note-folder" value={note.folder} onChange={(e) => immediate({ folder: e.target.value })} className="bg-surface2 rounded-lg h-7 px-1.5 text-ink focus:outline-none">
              {NOTE_FOLDERS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </span>
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
          data-placeholder="Počni pisati…"
          className="note-body mt-6 min-h-[320px] focus:outline-none text-[15px] leading-relaxed text-ink max-w-[68ch]"
        />
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Obrisati bilješku?" text={`„${note.title || 'Bez naslova'}" bit će trajno uklonjena.`} onConfirm={onDelete} />
    </Card>
  );
}
