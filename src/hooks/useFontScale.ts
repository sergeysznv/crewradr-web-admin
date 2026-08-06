'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useSupabase } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase/client';

// Must match the CHECK constraint on profiles.font_scale
export const FONT_SCALES = [0.8, 1.0, 1.2, 1.4, 1.6] as const;
export type FontScale = (typeof FONT_SCALES)[number];
const DEFAULT_SCALE: FontScale = 1.0;

type FontScaleResult = {
  scale: FontScale;
  setAndSync: (next: FontScale) => Promise<void>;
};

const STORAGE_KEY = 'crewradr_font_scale';

// ---------------------------------------------------------------------------
// Shared module-level Realtime subscription (same pattern as useMeasurementSystem).
// ---------------------------------------------------------------------------

type RemoteChange = {
  userId: string | null;
  fontScale: FontScale | null;
};

type Listener = (change: RemoteChange) => void;

const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureSharedChannel() {
  if (channel) return;
  channel = supabase
    .channel('profile_font_scale_sync')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      },
      (payload: { new: Record<string, unknown> }) => {
        const { user_id, font_scale } = payload.new;
        const change: RemoteChange = {
          userId: typeof user_id === 'string' ? user_id : null,
          fontScale:
            typeof font_scale === 'number' &&
            (FONT_SCALES as readonly number[]).includes(font_scale)
              ? (font_scale as FontScale)
              : null,
        };
        for (const listener of listeners) listener(change);
      },
    )
    .subscribe();
}

function isValidFontScale(v: unknown): v is FontScale {
  return typeof v === 'number' && (FONT_SCALES as readonly number[]).includes(v);
}

export function useFontScale(): FontScaleResult {
  const { data: account } = useAccountProfile();
  const profile = account?.profile ?? null;
  const supabaseClient = useSupabase();

  const [scale, setScale] = useState<FontScale>(() => {
    // 1. Profile override
    if (isValidFontScale(profile?.font_scale)) {
      return profile.font_scale;
    }

    // 2. SSR guard
    if (typeof window === 'undefined') return DEFAULT_SCALE;

    // 3. localStorage cache
    const cached = window.localStorage.getItem(STORAGE_KEY);
    const parsed = cached ? Number(cached) : null;
    if (isValidFontScale(parsed)) return parsed;

    return DEFAULT_SCALE;
  });

  // Hydrate from localStorage if profile had no value
  useEffect(() => {
    if (
      !isValidFontScale(profile?.font_scale) &&
      typeof window !== 'undefined'
    ) {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      const parsed = cached ? Number(cached) : null;
      if (isValidFontScale(parsed)) {
        setScale(parsed);
      }
    }
  }, [profile?.font_scale]);

  // Mid-session sync via Realtime
  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) return;

    const listener: Listener = ({ userId: changeUserId, fontScale }) => {
      if (changeUserId !== userId) return;
      if (fontScale !== null) {
        setScale(fontScale);
        localStorage.setItem(STORAGE_KEY, String(fontScale));
      } else {
        setScale(DEFAULT_SCALE);
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
    async (next: FontScale) => {
      const prev = scale;
      // Optimistic update
      setScale(next);
      localStorage.setItem(STORAGE_KEY, String(next));

      const { error } = await supabaseClient.from('profiles').upsert(
        {
          user_id: profile?.user_id,
          font_scale: next,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        // Revert on failure
        setScale(prev);
        localStorage.setItem(STORAGE_KEY, String(prev));
        console.error('Failed to sync font scale:', error);
      }
    },
    [profile?.user_id, scale],
  );

  return { scale, setAndSync };
}
