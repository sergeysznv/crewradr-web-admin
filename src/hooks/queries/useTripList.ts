'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getWebTripList } from '@/lib/rpc';

export function useTripList(crewId: string | null, days = 30, memberId?: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['tripList', crewId, days, memberId ?? null],
    queryFn: () => getWebTripList(supabase, crewId!, days, memberId),
    enabled: !!crewId,
  });
}
