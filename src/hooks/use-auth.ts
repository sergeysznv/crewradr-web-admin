'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* best-effort */ }
    setUser(null);
  }, []);

  const verifyMfa = useCallback(async (factorId: string, code: string) => {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { ok: false, error: error.message ?? null };
    // Explicitly set the AAL2 session returned by challengeAndVerify.
    // The Supabase client auto-saves on auth state change, but this guards
    // against race conditions where the next RPC call fires before the
    // internal _saveSession completes.  Without this the subsequent
    // get_web_account_profile RPC may see a stale/invalidated AAL1 token
    // and fail.
    if (data?.access_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    }
    return { ok: true, error: null };
  }, []);

  const getTotpFactor = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    return data?.totp?.find((f) => f.status === 'verified') ?? null;
  }, []);

  const isAal2 = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.currentLevel === 'aal2';
  }, []);

  const signInWithPasskey = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithPasskey();
    if (error) throw error;
    return data;
  }, []);

  const registerPasskey = useCallback(async () => {
    const { data, error } = await supabase.auth.registerPasskey();
    if (error) throw error;
    return data;
  }, []);

  const listPasskeys = useCallback(async () => {
    const { data, error } = await supabase.auth.passkey.list();
    if (error) throw error;
    return data;
  }, []);

  const deletePasskey = useCallback(async (passkeyId: string) => {
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    if (error) throw error;
  }, []);

  return { user, ready, signIn, signOut, verifyMfa, getTotpFactor, isAal2, signInWithPasskey, registerPasskey, listPasskeys, deletePasskey };
}
