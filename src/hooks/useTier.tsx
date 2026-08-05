'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { CrewTier, WebCrewSettings, TierContextValue } from '@/types/tier';
import { useCrew } from '@/hooks/useCrew';
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
  const { crewId } = useCrew();
  const [settings, setSettings] = useState<WebCrewSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState(0);
  const [pendingDowngradeTier, setPendingDowngradeTier] = useState<CrewTier | null>(null);
  const [isOverCapacity, setIsOverCapacity] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Latest active crew id, readable inside the async fetch (which closes over
  // the crewId from the moment the fetch was started).
  const crewIdRef = useRef<string | null>(crewId);
  crewIdRef.current = crewId;
  // Crew whose settings are currently staged; reset on change so stale
  // settings from a previously active crew never render.
  const settingsCrewRef = useRef<string | null>(null);

  const fetchSettings = useCallback(async () => {
    // No active crew yet (CrewLoader seeds it after mount) — wait for it.
    if (!crewId) return;
    try {
      setError(null);
      // Crew switch: drop the previous crew's settings immediately.
      if (settingsCrewRef.current !== crewId) {
        setSettings(null);
        setIsLoading(true);
        settingsCrewRef.current = crewId;
      }
      const { data, error: rpcErr } = await supabase.rpc('get_web_crew_settings', { p_crew_id: crewId });
      if (rpcErr) throw rpcErr;
      // Ignore stale responses that resolve after the user switched crews.
      if (!data || data.crewId !== crewIdRef.current) return;
      setSettings(data as WebCrewSettings);

      // Derive downgrade state from settings response
      setGraceDaysRemaining(data?.graceDaysRemaining ?? 0);
      setPendingDowngradeTier(data?.pendingDowngradeTier ?? null);
      setIsOverCapacity(data?.isOverCapacity ?? false);
    } catch (e) {
      if (crewIdRef.current === crewId) {
        setError(e instanceof Error ? e : new Error('Failed to load crew settings'));
      }
    } finally {
      // Only the fetch for the current crew may end the loading state.
      if (crewIdRef.current === crewId) setIsLoading(false);
    }
  }, [crewId]);

  useEffect(() => {
    // No active crew yet — nothing to fetch or subscribe to.
    if (!crewId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchSettings is async; setState occurs after await, not synchronously in the effect body
    fetchSettings();

    // Realtime subscription for tier changes. Recreated whenever the active
    // crew changes so the callback always refetches the current crew.
    const channel = supabase
      .channel('tier_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_subscriptions', filter: `crew_id=eq.${crewId}` },
        () => { fetchSettings(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchSettings, crewId]);

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
