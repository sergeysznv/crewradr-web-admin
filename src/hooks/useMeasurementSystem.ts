'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useSupabase } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase/client';
import {
  type MeasurementSystem,
  deriveSystemFromLocale,
} from '@/lib/units';

type MeasurementSystemResult = {
  system: MeasurementSystem;
  setAndSync: (next: MeasurementSystem) => Promise<void>;
};

const STORAGE_KEY = 'crewradr_measurement_system';

// ---------------------------------------------------------------------------
// Shared module-level Realtime subscription.
//
// Every `useMeasurementSystem()` consumer used to create its own channel under
// the same name (`profile_measurement_sync`); when one consumer unmounted it
// called `removeChannel`, tearing down the subscription for every other
// consumer. Instead we keep exactly one channel at module level, fan it out to
// a Set of listeners, and never tear it down while the page is open.
// ---------------------------------------------------------------------------

type RemoteChange = {
  userId: string | null;
  measurementSystem: MeasurementSystem | null;
};

type Listener = (change: RemoteChange) => void;

const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureSharedChannel() {
  if (channel) return;
  channel = supabase
    .channel('profile_measurement_sync')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      (payload: { new: Record<string, unknown> }) => {
        const { user_id, measurement_system } = payload.new;
        const change: RemoteChange = {
          userId: typeof user_id === 'string' ? user_id : null,
          measurementSystem:
            measurement_system === 'metric' ||
            measurement_system === 'imperial'
              ? measurement_system
              : null,
        };
        for (const listener of listeners) listener(change);
      },
    )
    .subscribe();
}

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
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached === 'metric' || cached === 'imperial') return cached;

    // 4. Browser locale
    return deriveSystemFromLocale(window.navigator.language);
  });

  // Hydration reconciliation: if SSR defaulted to 'metric' but browser locale
  // or localStorage says 'imperial', correct it on mount.
  useEffect(() => {
    if (!profile?.measurement_system && typeof window !== 'undefined') {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (!cached) {
        setSystem(deriveSystemFromLocale(window.navigator.language));
      }
    }
  }, [profile?.measurement_system]);

  // Mid-session sync via Supabase Realtime. The channel itself lives at
  // module level; this effect only (un)registers this consumer's listener so
  // one unmounting component never kills the subscription for the others.
  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) return;

    const listener: Listener = ({
      userId: changeUserId,
      measurementSystem,
    }) => {
      // Channel is shared and unfiltered; ignore other users' profiles.
      if (changeUserId !== userId) return;

      if (measurementSystem) {
        // Explicit metric/imperial override set on mobile.
        setSystem(measurementSystem);
        localStorage.setItem(STORAGE_KEY, measurementSystem);
      } else {
        // Null = auto-detect: drop any cached override and re-derive from the
        // browser locale so web follows the mobile reset.
        setSystem(deriveSystemFromLocale(window.navigator.language));
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    listeners.add(listener);
    ensureSharedChannel();

    return () => {
      listeners.delete(listener);
    };
  }, [profile?.user_id]);

  const setAndSync = useCallback(
    async (next: MeasurementSystem) => {
      const prev = system;
      // Optimistic update
      setSystem(next);
      localStorage.setItem(STORAGE_KEY, next);

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
        localStorage.setItem(STORAGE_KEY, prev);
        console.error('Failed to sync measurement system:', error);
      }
    },
    [profile?.user_id, system],
  );

  return { system, setAndSync };
}
