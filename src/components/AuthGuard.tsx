// src/components/AuthGuard.tsx
'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

// If the user closes the OAuth popup without completing the flow, no session
// event ever arrives — fall back to an error state instead of Loading... forever.
const OAUTH_TIMEOUT_MS = 60_000;

export function AuthGuard({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedInRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Complete the popup flow: a successful OAuth sign-in fires SIGNED_IN here.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        signedInRef.current = true;
        setReady(true);
        setError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // No setState before the first await: the mount effect calls this, and
  // synchronous setState within an effect is what the lint rule flags.
  const init = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        signedInRef.current = true;
        setReady(true);
        return;
      }
      // Throws when the OAuth popup is blocked or the request fails.
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      // signInWithOAuth resolves once the popup is open; a cancelled popup
      // produces no session event, so time out to a retryable error state.
      timeoutRef.current = setTimeout(() => {
        if (!signedInRef.current) setError('Sign in did not complete. Please try again.');
      }, OAUTH_TIMEOUT_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    }
  }, [supabase]);

  const handleRetry = useCallback(() => {
    setError(null);
    init();
  }, [init]);

  useEffect(() => {
    // Defer to a task so the auth flow's setState calls don't run
    // synchronously inside the effect (react-hooks/set-state-in-effect).
    const t = setTimeout(() => { init(); }, 0);
    return () => clearTimeout(t);
  }, [init]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-scaffold gap-3">
        <div className="text-sm font-semibold text-error">Sign in failed</div>
        <div className="text-sm text-on-surface-variant max-w-sm text-center">{error}</div>
        <button onClick={handleRetry}
          className="px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-scaffold">
        <div className="text-on-surface-variant text-sm">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
