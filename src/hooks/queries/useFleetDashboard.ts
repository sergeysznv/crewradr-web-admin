'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getFleetDashboard } from '@/lib/rpc';

export function useFleetDashboard(crewId: string | null, days: number = 30) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['fleetDashboard', crewId, days],
    queryFn: () => getFleetDashboard(supabase, crewId!, days),
    enabled: !!crewId,
  });
}
