'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translations';
import { useTheme } from '@/hooks/useTheme';
import { useVersionCheck } from '@/hooks/use-version-check';
import { supabase } from '@/lib/supabase/client';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, signIn, signOut, verifyMfa, getTotpFactor, isAal2, signInWithPasskey } = useAuth();
  const { t } = useT();
  const { resolved, toggleTheme } = useTheme();
  useVersionCheck();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'mfa' | 'no-mfa' | 'no-crew'>('login');
  const [mfaFactor, setMfaFactor] = useState<{ id: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [signedOutMsg, setSignedOutMsg] = useState('');
  const [passkeySupported] = useState(
    () => typeof window !== 'undefined' && window.PublicKeyCredential !== undefined
  );

  useEffect(() => {
    // Defer so the sessionStorage read + setState don't run synchronously
    // inside the effect (react-hooks/set-state-in-effect).
    const timer = setTimeout(() => {
      const reason = sessionStorage.getItem('crewradr-signed-out-reason');
      if (reason === 'inactivity') {
        setSignedOutMsg(t('webLoginSignedOutInactivity'));
        sessionStorage.removeItem('crewradr-signed-out-reason');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    isAal2().then((ok: boolean) => {
      if (ok) router.replace('/fleet');
    });
  }, [ready, user, isAal2, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) { setError(err); setBusy(false); return; }
    const factor = await getTotpFactor();
    if (factor) { setMfaFactor(factor); setStep('mfa'); }
    else { setStep('no-mfa'); }
    setBusy(false);
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaCode.trim() || !mfaFactor) return;
    setBusy(true);
    setError('');
    const { ok, error: err } = await verifyMfa(mfaFactor.id, mfaCode);
    if (!ok) { setError(t('webLoginMfaInvalidCode')); setBusy(false); return; }
    await supabase.auth.refreshSession();
    const { data, error: rpcErr } = await supabase.rpc('get_web_account_profile');
    if (rpcErr) {
      console.error('get_web_account_profile RPC failed:', rpcErr);
      setError(t('webLoginUnableToVerify'));
      setBusy(false);
      return;
    }
    if (!data?.crews?.length) {
      await signOut();
      setStep('no-crew');
      setBusy(false);
      return;
    }
    router.replace('/fleet');
  }

  async function handlePasskeySignIn() {
    setBusy(true);
    setError('');
    try {
      await signInWithPasskey();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('webLoginPasskeyFailed'));
      setBusy(false);
      return;
    }
    const factor = await getTotpFactor();
    if (factor) { setMfaFactor(factor); setStep('mfa'); }
    else { setStep('no-mfa'); }
    setBusy(false);
  }

  function reset() { setStep('login'); setMfaFactor(null); setMfaCode(''); setError(''); }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-[var(--brand-surface)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-seed)]" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-[var(--brand-surface)] dark:bg-[var(--brand-surface)]">
      {/* Brand glow */}
      <div className="brand-glow" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-colors hover:border-[var(--brand-seed)]"
        style={{ borderColor: 'color-mix(in srgb, var(--brand-seed) 20%, transparent)' }}
        aria-label="Toggle theme"
      >
        {resolved === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
      </button>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-9 text-center">
          <img
            src="/logo-96.png" alt="CrewRadr" width={96} height={96}
            className="mx-auto mb-9 rounded-[22px]"
            style={{ boxShadow: '0 8px 40px color-mix(in srgb, var(--brand-seed) 25%, transparent)' }}
          />
          <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-bold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
            CrewRadr<span className="text-[var(--brand-accent)]"> Web</span>
          </h1>
          <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">{t('webLoginSubtitle')}</p>
        </div>

        {signedOutMsg && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            {signedOutMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {step === 'login' && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <form onSubmit={handleLogin}>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('webLoginEmail')}</label>
              <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder="captain@crewradr.app" autoComplete="email" autoFocus />
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('webLoginPassword')}</label>
              <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="mb-6 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                autoComplete="current-password" />
              <button type="submit" disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-seed)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t('webLoginSigningIn') : t('webLoginSignIn')}
              </button>
            </form>
            {passkeySupported && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                  {t('webLoginOr')}
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <button type="button" onClick={handlePasskeySignIn} disabled={busy}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50">
                  {t('webLoginSignInPasskey')}
                </button>
              </>
            )}
          </div>
        )}

        {step === 'mfa' && (
          <div className="rounded-xl border-2 bg-white p-8 shadow-sm dark:bg-zinc-900" style={{ borderColor: 'color-mix(in srgb, var(--brand-seed) 20%, transparent)' }}>
            <form onSubmit={handleMfa}>
              <div className="mb-4 flex items-center gap-2">
                <button type="button" onClick={reset} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('webLoginMfaTitle')}</h2>
              </div>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{t('webLoginMfaDesc')}</p>
              <label className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('webLoginMfaCode')}</label>
              <input id="mfaCode" name="mfaCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-center text-2xl tracking-[0.5em] font-mono text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder="123456" autoComplete="one-time-code" autoFocus />
              <button type="submit" disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-seed)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t('webLoginMfaVerify')}
              </button>
            </form>
          </div>
        )}

        {step === 'no-mfa' && (
          <div className="rounded-xl border-2 border-amber-200 bg-white p-8 shadow-sm dark:border-amber-800 dark:bg-zinc-900">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-amber-600" />
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('webLogin2faRequiredTitle')}</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t('webLogin2faRequiredDesc')}</p>
              <div className="mt-6 space-y-3 rounded-lg bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{t('webLogin2faSetupSteps')}</p>
                <ol className="list-decimal space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
                  <li>{t('webLogin2faStep1')}</li>
                  <li>{t('webLogin2faStep2')}</li>
                  <li>{t('webLogin2faStep3')}</li>
                </ol>
              </div>
              <button onClick={signOut} className="mt-6 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">{t('webLoginSignOut')}</button>
            </div>
          </div>
        )}

        {step === 'no-crew' && (
          <div className="rounded-xl border-2 border-red-200 bg-white p-8 shadow-sm dark:border-red-800 dark:bg-zinc-900">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('webLoginNoCrewTitle')}</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t('webLoginNoCrewFoundDesc')}</p>
              <button onClick={signOut} className="mt-6 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">{t('webLoginSignOut')}</button>
            </div>
          </div>
        )}

        {step === 'login' && (
          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">{t('webLogin2faRequired')}</p>
        )}
      </div>
    </div>
  );
}
