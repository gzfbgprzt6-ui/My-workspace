import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, WifiOff, Check } from 'lucide-react';
import { supabase, hrError } from './db';
import { Button, Field, inputCls } from './ui';
import { cx } from './utils';
import { useOnline } from './store';

type Mode = 'prijava' | 'registracija' | 'zaboravljeno';

const appUrl = () => window.location.origin + window.location.pathname;

export function AuthScreen() {
  const online = useOnline();
  const [mode, setMode] = useState<Mode>('prijava');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!online) return setError('Uređaj je izvan mreže. Za prijavu je potrebna internetska veza.');
    setBusy(true);
    try {
      if (mode === 'prijava') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'registracija') {
        if (password.length < 8) throw new Error('Lozinka mora imati najmanje 8 znakova.');
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() }, emailRedirectTo: appUrl() } });
        if (error) throw error;
        if (!data.session) setInfo('Račun je kreiran. Otvori poveznicu za potvrdu koju smo poslali na tvoju e-poštu, zatim se prijavi.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl() });
        if (error) throw error;
        setInfo('Ako račun postoji, poslali smo poveznicu za novu lozinku.');
      }
    } catch (err) {
      setError(hrError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden bg-lav text-[#1E1640] p-12 flex-col justify-between">
        <div aria-hidden className="absolute -right-16 -top-20 w-80 h-80 rounded-full bg-butter/80" />
        <div aria-hidden className="absolute right-40 -bottom-24 w-72 h-72 rounded-full bg-peach/90" />
        <div aria-hidden className="absolute right-16 bottom-28 w-24 h-24 rounded-full bg-mint" />
        <LogoMark />
        <div className="relative max-w-md">
          <h1 className="text-[56px] leading-[1.02] font-bold tracking-tight">Make today yours.</h1>
          <p className="mt-4 text-lg text-[#2E2456]">Zadaci, kalendar, projekti, bilješke i financije na jednom mjestu. Na iPhoneu, iPadu i računalu.</p>
        </div>
        <p className="relative text-sm text-[#2E2456]">Tvoji podaci vidljivi su samo tvom računu.</p>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><LogoMark /></div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {mode === 'prijava' ? 'Prijava' : mode === 'registracija' ? 'Novi račun' : 'Nova lozinka'}
          </h2>
          <p className="text-sm text-muted mt-1">
            {mode === 'prijava' ? 'Dobro došao natrag.' : mode === 'registracija' ? 'Kreiraj svoj osobni radni prostor.' : 'Poslat ćemo ti poveznicu za postavljanje nove lozinke.'}
          </p>

          {!online && (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-peach/25 text-peach-ink text-sm px-3 py-2.5" role="alert">
              <WifiOff size={15} /> Izvan mreže. Prijava zahtijeva internet.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
            {mode === 'registracija' && (
              <Field label="Ime" htmlFor="auth-name">
                <IconInput icon={<User size={15} />}>
                  <input id="auth-name" autoComplete="given-name" className={cx(inputCls, 'pl-9')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kako da te pozdravimo?" />
                </IconInput>
              </Field>
            )}
            <Field label="E-pošta" htmlFor="auth-email">
              <IconInput icon={<Mail size={15} />}>
                <input id="auth-email" type="email" autoComplete="email" inputMode="email" required className={cx(inputCls, 'pl-9')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ime@primjer.hr" />
              </IconInput>
            </Field>
            {mode !== 'zaboravljeno' && (
              <Field label="Lozinka" htmlFor="auth-password" hint={mode === 'registracija' ? 'Najmanje 8 znakova.' : undefined}>
                <IconInput icon={<Lock size={15} />}>
                  <input id="auth-password" type="password" autoComplete={mode === 'prijava' ? 'current-password' : 'new-password'} required className={cx(inputCls, 'pl-9')} value={password} onChange={(e) => setPassword(e.target.value)} />
                </IconInput>
              </Field>
            )}
            {error && <p className="text-sm text-peach-ink bg-peach/15 rounded-xl px-3 py-2.5" role="alert">{error}</p>}
            {info && (
              <p className="text-sm text-mint-ink bg-mint/15 rounded-xl px-3 py-2.5 flex gap-2" role="status">
                <Check size={16} className="shrink-0 mt-0.5" /> {info}
              </p>
            )}
            <Button type="submit" variant="primary" className="h-11" disabled={busy || !email.trim() || (mode !== 'zaboravljeno' && !password)}>
              {busy ? 'Pričekaj…' : mode === 'prijava' ? 'Prijavi se' : mode === 'registracija' ? 'Kreiraj račun' : 'Pošalji poveznicu'}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted grid gap-2">
            {mode === 'prijava' ? (
              <>
                <button type="button" className="text-left hover:text-ink underline underline-offset-2" onClick={() => { setMode('zaboravljeno'); setError(null); setInfo(null); }}>
                  Zaboravio si lozinku?
                </button>
                <span>
                  Nemaš račun?{' '}
                  <button type="button" className="font-semibold text-ink hover:underline" onClick={() => { setMode('registracija'); setError(null); setInfo(null); }}>
                    Registriraj se
                  </button>
                </span>
              </>
            ) : (
              <button type="button" className="text-left font-semibold text-ink hover:underline" onClick={() => { setMode('prijava'); setError(null); setInfo(null); }}>
                Natrag na prijavu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown after the user opens a password-reset link. */
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-5">
      <form
        className="w-full max-w-sm grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) return setError('Lozinka mora imati najmanje 8 znakova.');
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) setError(hrError(error.message));
          else onDone();
        }}
      >
        <LogoMark />
        <h2 className="text-2xl font-bold text-ink mt-4">Postavi novu lozinku</h2>
        <Field label="Nova lozinka" htmlFor="new-pw" hint="Najmanje 8 znakova.">
          <input id="new-pw" type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-peach-ink" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Spremanje…' : 'Spremi lozinku'}</Button>
      </form>
    </div>
  );
}

function IconInput({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{icon}</span>
      {children}
    </div>
  );
}

export function LogoMark() {
  return (
    <div className="relative flex items-center gap-2.5">
      <div className="w-10 h-10 shrink-0 rounded-[13px] bg-[#282633] grid grid-cols-2 gap-[3px] p-[8px]" aria-hidden>
        <span className="rounded-[3px] bg-lav" />
        <span className="rounded-[3px] bg-mint" />
        <span className="rounded-[3px] bg-peach" />
        <span className="rounded-[3px] bg-butter" />
      </div>
      <div className="leading-tight">
        <p className="font-bold text-[15px] tracking-[0.06em]">MY WORKSPACE</p>
        <p className="text-[12px] opacity-70">Personal Work OS</p>
      </div>
    </div>
  );
}
