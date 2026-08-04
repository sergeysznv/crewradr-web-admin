'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getFleetDashboard } from '@/lib/rpc';

export function useFleetDashboard(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['fleetDashboard', crewId],
    queryFn: () => getFleetDashboard(supabase, crewId!),
    enabled: !!crewId,
  });
}
