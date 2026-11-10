import React, { useState } from 'react';
import { Inbox as InboxIcon, Lightbulb, SquareCheck, StickyNote, Trash2, ArrowRight, Send } from 'lucide-react';
import { useStore } from '../store';
import { Button, Card, Empty, IconButton, PageHeader, Segmented } from '../ui';
import type { InboxItem, InboxKind } from '../types';
import { cx, fmtDateTime, todayISO, uid } from '../utils';

const KIND_META: Record<InboxKind, { label: string; icon: React.ReactNode; cls: string }> = {
  ideja: { label: 'Ideja', icon: <Lightbulb size={15} />, cls: 'bg-lav/15 text-lav-ink' },
  zadatak: { label: 'Zadatak', icon: <SquareCheck size={15} />, cls: 'bg-mint/20 text-mint-ink' },
  bilješka: { label: 'Bilješka', icon: <StickyNote size={15} />, cls: 'bg-butter/25 text-butter-ink' },
};

export function Inbox() {
  const { data, upsert, remove, toast } = useStore();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<InboxKind>('ideja');

  const capture = () => {
    if (!text.trim()) return;
    upsert('inbox', { id: uid(), text: text.trim(), kind, createdAt: new Date().toISOString() });
    setText('');
    toast('Zabilježeno u ulazni spremnik');
  };

  const toTask = (i: InboxItem) => {
    upsert('tasks', { id: uid(), title: i.text, done: false, priority: 'srednji', category: 'Osobno', subtasks: [], recurring: null, createdAt: todayISO() });
    remove('inbox', i.id);
    toast('Pretvoreno u zadatak');
  };
  const toNote = (i: InboxItem) => {
    upsert('notes', { id: uid(), title: i.text.slice(0, 60), html: `<p>${i.text.replace(/</g, '&lt;')}</p>`, folder: 'Osobno', tags: i.kind === 'ideja' ? ['ideja'] : [], pinned: false, updatedAt: new Date().toISOString() });
    remove('inbox', i.id);
    toast('Pretvoreno u bilješku');
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ulazni spremnik" subtitle="Brzo zabilježi sve što ti padne na pamet. Organiziraj kasnije." />
      <Card className="mb-6">
        <label htmlFor="inbox-input" className="sr-only">
          Novi unos
        </label>
        <textarea
          id="inbox-input"
          autoFocus
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          placeholder="Što ti je na umu?"
          className="w-full resize-none bg-transparent text-lg text-ink placeholder:text-muted/60 focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <Segmented<InboxKind>
            label="Vrsta unosa"
            value={kind}
            onChange={setKind}
            options={(Object.keys(KIND_META) as InboxKind[]).map((k) => ({ value: k, label: KIND_META[k].label, icon: KIND_META[k].icon }))}
          />
          <Button variant="primary" onClick={capture} disabled={!text.trim()}>
            <Send size={15} /> Zabilježi
          </Button>
        </div>
        <p className="text-xs text-muted mt-2">Enter sprema, Shift + Enter za novi red.</p>
      </Card>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">Za organizirati · {data.inbox.length}</h2>
      {data.inbox.length ? (
        <ul className="grid grid-cols-1 gap-2">
          {data.inbox.map((i) => (
            <li key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-surface border border-line/80 p-3.5 shadow-soft animate-rise">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={cx('grid place-items-center w-8 h-8 rounded-xl shrink-0', KIND_META[i.kind].cls)}>{KIND_META[i.kind].icon}</span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">{i.text}</p>
                  <p className="text-[11px] text-muted mt-0.5">{fmtDateTime(i.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:shrink-0 pl-11 sm:pl-0">
                <Button size="sm" onClick={() => toTask(i)}>
                  <ArrowRight size={13} /> Zadatak
                </Button>
                <Button size="sm" onClick={() => toNote(i)}>
                  <ArrowRight size={13} /> Bilješka
                </Button>
                <IconButton label="Obriši unos" onClick={() => { remove('inbox', i.id); toast('Unos je obrisan'); }}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <Empty icon={<InboxIcon size={20} />} title="Spremnik je prazan" text="Sve je organizirano. Lijepo." />
        </Card>
      )}
    </div>
  );
}
