import React, { useState } from 'react';
import { Sun, Moon, Monitor, Copy, Check, Cloud, Shield, Smartphone, Database, LogOut, Download, KeyRound, Trash2, Sparkles, Radio } from 'lucide-react';
import { useStore, useOnline } from '../store';
import { Button, Card, CardHeader, Chip, ConfirmDialog, Field, PageHeader, Segmented, inputCls } from '../ui';
import type { ThemePref } from '../types';
import { cx, fmtDateTime, todayISO } from '../utils';
import { supabase, hrError } from '../db';
import { APP_VERSION } from '../config';

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Settings() {
  const { data, setSettings, syncState, realtime, lastSynced, toast, signOut, loadSample, deleteAll, refresh } = useStore();
  const online = useOnline();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pw, setPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const { settings, version: _v, ...rest } = data;
  const exportJson = () => JSON.stringify({ exportedAt: new Date().toISOString(), app: 'MY WORKSPACE', version: APP_VERSION, ...rest, settings: { name: settings.name, theme: settings.theme } }, null, 2);

  const csv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Datum', 'Vrsta', 'Kategorija', 'Opis', 'Iznos (EUR)', 'Ponavlja se'].map(esc).join(';')];
    for (const t of [...data.txns].sort((a, b) => a.date.localeCompare(b.date))) {
      const [y, m, d] = t.date.split('-');
      rows.push([`${d}.${m}.${y}`, t.type, t.category, t.description, t.amount.toFixed(2).replace('.', ','), t.recurring ? 'da' : 'ne'].map(esc).join(';'));
    }
    return '﻿' + rows.join('\r\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Kopiranje nije dopušteno u ovom pregledniku. Koristi preuzimanje.', 'error');
    }
  };

  const empty = !data.tasks.length && !data.projects.length && !data.notes.length && !data.txns.length;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Postavke" subtitle="Račun, izgled, sinkronizacija i podaci" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Račun" />
          <div className="grid grid-cols-1 gap-4">
            <Field label="Ime za pozdrav" htmlFor="set-name">
              <input id="set-name" className={inputCls} value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} />
            </Field>
            <Field label="E-pošta" htmlFor="set-email">
              <input id="set-email" className={inputCls} value={settings.email} disabled />
            </Field>
            <form
              className="grid grid-cols-1 gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (pw.length < 8) return toast('Lozinka mora imati najmanje 8 znakova.', 'error');
                setPwBusy(true);
                const { error } = await supabase.auth.updateUser({ password: pw });
                setPwBusy(false);
                if (error) toast(hrError(error.message), 'error');
                else {
                  setPw('');
                  toast('Lozinka je promijenjena');
                }
              }}
            >
              <Field label="Nova lozinka" htmlFor="set-pw">
                <div className="flex gap-2">
                  <input id="set-pw" type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Najmanje 8 znakova" />
                  <Button type="submit" disabled={!pw || pwBusy}>
                    <KeyRound size={15} /> Promijeni
                  </Button>
                </div>
              </Field>
            </form>
            <Button variant="ghost" className="justify-start -ml-2" onClick={signOut}>
              <LogOut size={15} /> Odjava s ovog uređaja
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Izgled" />
          <Field label="Tema" htmlFor="set-theme">
            <div id="set-theme">
              <Segmented<ThemePref>
                label="Tema"
                value={settings.theme}
                onChange={(v) => setSettings({ theme: v })}
                options={[
                  { value: 'svijetla', label: 'Svijetla', icon: <Sun size={14} /> },
                  { value: 'tamna', label: 'Tamna', icon: <Moon size={14} /> },
                  { value: 'sustav', label: 'Sustav', icon: <Monitor size={14} /> },
                ]}
              />
            </div>
          </Field>
          <div className="mt-5 grid grid-cols-1 gap-2 text-sm">
            <Row k="Jezik" v="Hrvatski" />
            <Row k="Valuta" v="EUR (€)" />
            <Row k="Format datuma" v="DD.MM.YYYY" />
            <Row k="Tjedan počinje" v="Ponedjeljkom" />
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader icon={<Cloud size={16} />} tone="sky" title="Sinkronizacija" action={<Button size="sm" variant="ghost" onClick={() => refresh()} disabled={!online}>Osvježi sada</Button>} />
          <div className="grid sm:grid-cols-3 gap-3">
            <StatusTile label="Veza" value={online ? 'Na mreži' : 'Izvan mreže'} ok={online} />
            <StatusTile
              label="Spremanje u oblak"
              value={{ synced: 'Sve je spremljeno', saving: 'Spremanje…', loading: 'Učitavanje…', error: 'Greška: dodirni Osvježi', offline: 'Pauzirano' }[syncState]}
              ok={syncState === 'synced' || syncState === 'saving'}
              sub={lastSynced ? `Zadnja sinkronizacija ${fmtDateTime(lastSynced.toISOString())}` : undefined}
            />
            <StatusTile label="Promjene s drugih uređaja" value={realtime === 'live' ? 'Uživo' : realtime === 'connecting' ? 'Povezivanje…' : 'Nedostupno'} ok={realtime === 'live'} icon={<Radio size={12} />} sub={realtime === 'down' ? 'Podaci se osvježe kad se vratiš u aplikaciju.' : undefined} />
          </div>
          <p className="mt-4 text-sm text-muted">
            Podaci su spremljeni u tvojoj privatnoj Supabase bazi (EU, Frankfurt) i vidljivi su samo tvom računu. Aplikacija radi uz internetsku vezu. Bez veze vidiš zadnje učitane podatke, ali izmjene su onemogućene.
          </p>
        </Card>

        <Card>
          <CardHeader icon={<Database size={16} />} tone="lav" title="Izvoz podataka" />
          <p className="text-sm text-muted mb-3">Preuzmi potpunu sigurnosnu kopiju ili transakcije za Excel.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => download(`my-workspace-${todayISO()}.json`, exportJson(), 'application/json')}>
              <Download size={15} /> Sve (JSON)
            </Button>
            <Button onClick={() => download(`transakcije-${todayISO()}.csv`, csv(), 'text/csv;charset=utf-8')}>
              <Download size={15} /> Transakcije (CSV)
            </Button>
            <Button variant="ghost" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Kopirano' : 'Kopiraj JSON'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Sparkles size={16} />} tone="butter" title="Podaci računa" />
          <p className="text-sm text-muted mb-3">
            {empty ? 'Račun je prazan. Možeš učitati primjere da isprobaš aplikaciju.' : 'Obriši sve zapise kad želiš krenuti ispočetka (npr. nakon isprobavanja primjera).'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={sampleBusy}
              onClick={async () => {
                setSampleBusy(true);
                await loadSample();
                setSampleBusy(false);
              }}
            >
              <Sparkles size={15} /> {sampleBusy ? 'Učitavanje…' : 'Učitaj primjere'}
            </Button>
            {!empty && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Obriši sve
              </Button>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader icon={<Shield size={16} />} tone="mint" title="Plan razvoja" />
          <ol className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { n: 1, t: 'Vizualni prototip', d: 'Dizajn, navigacija i svi moduli', s: 'Gotovo' },
              { n: 2, t: 'Supabase temelj', d: 'Prijava e-poštom, baza, RLS pravila, CRUD', s: 'Gotovo' },
              { n: 3, t: 'Sinkronizacija', d: 'Svi moduli na bazi, promjene uživo između uređaja', s: 'Gotovo' },
              { n: 4, t: 'Objava i PWA', d: 'Instalacija na početni zaslon, upute', s: 'U tijeku' },
            ].map((x) => (
              <li key={x.n} className={cx('rounded-2xl p-4 border', x.n < 4 ? 'border-mint/60 bg-mint/10' : 'border-line')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">FAZA {x.n}</span>
                  <Chip tone={x.n < 4 ? 'mint' : 'butter'}>{x.s}</Chip>
                </div>
                <p className="font-semibold text-ink mt-1">{x.t}</p>
                <p className="text-muted text-xs mt-0.5">{x.d}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted mt-4 flex items-center gap-1.5">
            <Smartphone size={13} /> Na iPhoneu i iPadu: Safari → Dijeli → Dodaj na početni zaslon. Na Windowsu: ikona instalacije u adresnoj traci Chromea ili Edgea. · Verzija {APP_VERSION}
          </p>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Obrisati sve podatke?"
        text="Trajno se brišu svi zadaci, događaji, projekti, bilješke, transakcije, budžeti, ciljevi i unosi u ulaznom spremniku na svim uređajima. Ovo se ne može poništiti. Preporuka: prvo preuzmi izvoz."
        onConfirm={() => void deleteAll()}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line/70 pb-2 last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-ink font-medium">{v}</span>
    </div>
  );
}

function StatusTile({ label, value, ok, sub, icon }: { label: string; value: string; ok: boolean; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface2/70 p-3.5">
      <p className="text-xs text-muted flex items-center gap-1">{icon}{label}</p>
      <p className="font-semibold text-ink mt-1 flex items-center gap-2 text-sm">
        <span className={cx('w-2 h-2 rounded-full shrink-0', ok ? 'bg-mint' : 'bg-peach')} />
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
    </div>
  );
}
