'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const WARN_AFTER_MS = 13 * 60 * 1000; // 13 min — show "Still here?" prompt
const LOGOUT_AFTER_MS = 15 * 60 * 1000; // 15 min — force sign out

export function useSessionTimeout() {
  const router = useRouter();
  const [idleWarning, setIdleWarning] = useState(false);
  // Initialized in the mount effect — Date.now() during render would be
  // impure (react-hooks/purity).
  const lastActivity = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signedOutRef = useRef(false);

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    if (idleWarning) setIdleWarning(false);
  }, [idleWarning]);

  const handleSignOut = useCallback(async () => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    await supabase.auth.signOut();
    sessionStorage.setItem('crewradr-signed-out-reason', 'inactivity');
    router.replace('/');
  }, [router]);

  const staySignedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    lastActivity.current = Date.now();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed > LOGOUT_AFTER_MS) {
        handleSignOut();
      } else if (elapsed > WARN_AFTER_MS) {
        setIdleWarning(true);
      }
    }, 5_000); // check every 5 s for responsive countdown

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) handleSignOut();
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [resetTimer, handleSignOut]);

  return { idleWarning, staySignedIn, handleSignOut };
}
