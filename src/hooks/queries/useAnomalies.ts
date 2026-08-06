'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getWebAnomalies } from '@/lib/rpc';

export function useAnomalies(crewId: string | null, days = 30, enabled = true) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['anomalies', crewId, days],
    queryFn: () => getWebAnomalies(supabase, crewId!, days),
    enabled: !!crewId && enabled,
  });
}
