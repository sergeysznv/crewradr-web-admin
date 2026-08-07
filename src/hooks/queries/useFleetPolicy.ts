'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getFleetPolicy, saveFleetPolicy } from '@/lib/rpc';
import type { FleetPolicy } from '@/types/tier';

export function useFleetPolicy(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['fleetPolicy', crewId],
    queryFn: () => getFleetPolicy(supabase, crewId!),
    enabled: !!crewId,
  });
}

export function useSaveFleetPolicy(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (policy: Partial<FleetPolicy>) =>
      saveFleetPolicy(supabase, crewId!, policy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleetPolicy', crewId] });
    },
  });
}
