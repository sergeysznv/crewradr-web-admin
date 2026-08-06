'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useSupabase } from '@/hooks/useSupabase';
import {
  type MeasurementSystem,
  deriveSystemFromLocale,
} from '@/lib/units';

type MeasurementSystemResult = {
  system: MeasurementSystem;
  setAndSync: (next: MeasurementSystem) => Promise<void>;
};

export function useMeasurementSystem(): MeasurementSystemResult {
  const { data: account } = useAccountProfile();
  const profile = account?.profile ?? null;
  const supabase = useSupabase();

  const [system, setSystem] = useState<MeasurementSystem>(() => {
    // 1. Profile override (server-safe if profile is fetched server-side)
    if (
      profile?.measurement_system === 'metric' ||
      profile?.measurement_system === 'imperial'
    ) {
      return profile.measurement_system;
    }

    // 2. SSR guard — server renders 'metric' as safe default
    if (typeof window === 'undefined') return 'metric';

    // 3. localStorage cache
    const cached = window.localStorage.getItem('crewradr_measurement_system');
    if (cached === 'metric' || cached === 'imperial') return cached;

    // 4. Browser locale
    return deriveSystemFromLocale(window.navigator.language);
  });

  // Hydration reconciliation: if SSR defaulted to 'metric' but browser locale
  // or localStorage says 'imperial', correct it on mount.
  useEffect(() => {
    if (!profile?.measurement_system && typeof window !== 'undefined') {
      const cached = window.localStorage.getItem('crewradr_measurement_system');
      if (!cached) {
        setSystem(deriveSystemFromLocale(window.navigator.language));
      }
    }
  }, [profile?.measurement_system]);

  // Mid-session sync via Supabase Realtime
  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) return;

    const channel = supabase
      .channel('profile_measurement_sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const remote = payload.new?.measurement_system;
          if (remote === 'metric' || remote === 'imperial') {
            setSystem(remote);
            localStorage.setItem('crewradr_measurement_system', remote);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

  const setAndSync = useCallback(
    async (next: MeasurementSystem) => {
      const prev = system;
      // Optimistic update
      setSystem(next);
      localStorage.setItem('crewradr_measurement_system', next);

      const { error } = await supabase.from('profiles').upsert(
        {
          user_id: profile?.user_id,
          measurement_system: next,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        // Revert on failure
        setSystem(prev);
        localStorage.setItem('crewradr_measurement_system', prev);
        console.error('Failed to sync measurement system:', error);
      }
    },
    [profile?.user_id, system],
  );

  return { system, setAndSync };
}
