import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { supabase } from './supabaseClient';

interface Props {
  onAuthenticated: (email?: string, fullName?: string) => Promise<void>;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
    if (result.error) {
      setError(result.error.message);
    } else if (mode === 'signup' && !result.data.session) {
      setMessage('Account created. Confirm your email, then sign in.');
    } else {
      await onAuthenticated(email, fullName);
    }
    setBusy(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      <section className="glass relative w-full max-w-md rounded-[2rem] p-7 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"><Sparkles size={16} /> LOCAL / HOBBYIST</div>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to discover your local skill circle.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && <label className="block text-sm text-slate-300">Full name<input className="input-field mt-2" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Alex Mercer" /></label>}
          <label className="block text-sm text-slate-300">Email<div className="relative mt-2"><Mail className="absolute left-4 top-3.5 text-slate-500" size={17} /><input className="input-field pl-11" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></div></label>
          <label className="block text-sm text-slate-300">Password<div className="relative mt-2"><LockKeyhole className="absolute left-4 top-3.5 text-slate-500" size={17} /><input className="input-field pl-11" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="At least 6 characters" /></div></label>
          {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60">{busy ? 'Connecting...' : mode === 'signin' ? 'Sign in' : 'Create account'} {!busy && <ArrowRight size={16} />}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }} className="mt-6 w-full text-center text-sm text-slate-500 hover:text-emerald-300">{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  );
}
