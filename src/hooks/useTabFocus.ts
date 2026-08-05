// src/hooks/useTabFocus.ts
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * When the tab regains visibility after being hidden, re-establishes the
 * Realtime WebSocket if it dropped and invalidates crew settings queries
 * so tier/state changes made elsewhere are picked up.
 */
export function useTabFocus() {
  const queryClient = useQueryClient();
  const wasHidden = useRef(false);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden.current = true;
        return;
      }

      if (document.visibilityState === 'visible' && wasHidden.current) {
        wasHidden.current = false;

        // Check Realtime WebSocket state
        const wsState = supabase.realtime.connectionState();
        if (wsState === 'closed' || wsState === 'closing') {
          supabase.realtime.connect();
        }

        // Light invalidation to catch tier/state changes (prefix match
        // on ['crewSettings', crewId] queries).
        queryClient.invalidateQueries({ queryKey: ['crewSettings'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [queryClient]);
}
