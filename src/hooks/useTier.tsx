'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { CrewTier, WebCrewSettings, TierContextValue } from '@/types/tier';
import { supabase } from '@/lib/supabase/client';

const TierContext = createContext<TierContextValue>({
  tier: 'deckhand',
  settings: null,
  isLoading: true,
  error: null,
  graceDaysRemaining: 0,
  pendingDowngradeTier: null,
  isOverCapacity: false,
  isInLockout: false,
});

export function useTier(): TierContextValue {
  return useContext(TierContext);
}

export function TierProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WebCrewSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState(0);
  const [pendingDowngradeTier, setPendingDowngradeTier] = useState<CrewTier | null>(null);
  const [isOverCapacity, setIsOverCapacity] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc('get_web_crew_settings');
      if (rpcErr) throw rpcErr;
      setSettings(data as WebCrewSettings);

      // Derive downgrade state from settings response
      setGraceDaysRemaining(data?.graceDaysRemaining ?? 0);
      setPendingDowngradeTier(data?.pendingDowngradeTier ?? null);
      setIsOverCapacity(data?.isOverCapacity ?? false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load crew settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchSettings is async; setState occurs after await, not synchronously in the effect body
    fetchSettings();

    // Realtime subscription for tier changes
    const channel = supabase
      .channel('tier_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_subscriptions' },
        () => { fetchSettings(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchSettings]);

  const tier: CrewTier = settings?.tier ?? 'deckhand';
  const isInLockout = graceDaysRemaining <= 0 && isOverCapacity;

  return (
    <TierContext.Provider
      value={{
        tier,
        settings,
        isLoading,
        error,
        graceDaysRemaining,
        pendingDowngradeTier,
        isOverCapacity,
        isInLockout,
      }}
    >
      {children}
    </TierContext.Provider>
  );
}
