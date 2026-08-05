'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getWebRiskPredictions } from '@/lib/rpc';

export function useRiskPredictions(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['riskPredictions', crewId],
    queryFn: () => getWebRiskPredictions(supabase, crewId!),
    enabled: !!crewId,
  });
}
