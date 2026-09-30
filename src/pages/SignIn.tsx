import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { APP_NAME, APP_TAGLINE } from '../lib/config';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Enter a valid email address.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.href }
    });
    setBusy(false);
    if (err) return setError(err.message.includes('rate') ? 'Too many emails sent. Wait a minute and try again.' : err.message);
    setStep('code');
    setCooldown(60);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setError('Enter the code from the email.');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    setBusy(false);
    if (err) setError('That code did not work. Check the latest email or send a new code.');
  };

  return (
    <main className="page">
      <section className="stack-10 signin-head">
        <span className="brand-mark" aria-hidden="true" />
        <h1 className="display-lg">{APP_NAME}</h1>
        <p className="lede">{APP_TAGLINE}. Sign in to log dives, find buddies and share what the water is like.</p>
      </section>

      {step === 'email' ? (
        <form className="form" onSubmit={send} noValidate>
          <label>Email
            <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Sending...' : 'Email me a sign-in code'}</button>
          <p className="tiny muted">No password needed. New here? This creates your account.</p>
        </form>
      ) : (
        <form className="form" onSubmit={verify} noValidate>
          <p>We sent a sign-in email to <strong>{email.trim()}</strong>. Enter the code from it, or tap the link in the email on this device.</p>
          <label>Sign-in code
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? 'Checking...' : 'Sign in'}</button>
          <div className="row-between">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep('email'); setCode(''); setError(''); }}>Use a different email</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={cooldown > 0 || busy} onClick={() => send()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
