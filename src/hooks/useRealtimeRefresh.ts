'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';

interface RealtimeTable {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

/**
 * Subscribes to postgres_changes on the given tables and invalidates the
 * React Query key on every change (silent background refresh). Mirrors the
 * production realtime pattern (channel + postgres_changes + reload).
 */
export function useRealtimeInvalidation(
  crewId: string | null,
  channelName: string,
  tables: RealtimeTable[],
  queryKey: string[],
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const keyHash = queryKey.join('/');
  const tablesHash = JSON.stringify(tables);

  useEffect(() => {
    if (!crewId) return;
    const channel = supabase.channel(channelName);
    for (const cfg of tables) {
      channel.on(
        'postgres_changes',
        { event: cfg.event ?? '*', schema: 'public', table: cfg.table, ...(cfg.filter ? { filter: cfg.filter } : {}) },
        () => queryClient.invalidateQueries({ queryKey }),
      );
    }
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, channelName, keyHash, tablesHash, supabase, queryClient]);
}

/**
 * Refetches (invalidates) queries when the tab regains focus/visibility.
 * Throttled to once per 5s to avoid double-fetching. Without a key it
 * invalidates everything — mount once in the dashboard layout.
 */
export function useVisibilityRefetch(queryKey?: string[]) {
  const queryClient = useQueryClient();
  const keyHash = queryKey?.join('/');

  useEffect(() => {
    let lastRefetch = Date.now();
    const refetch = () => {
      if (Date.now() - lastRefetch <= 5000) return;
      lastRefetch = Date.now();
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      else queryClient.invalidateQueries();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, keyHash]);
}
