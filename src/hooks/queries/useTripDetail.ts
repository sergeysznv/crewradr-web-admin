'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getTripDetail } from '@/lib/rpc';

export function useTripDetail(tripId: string | null) {
  return useQuery({
    queryKey: ['tripDetail', tripId],
    queryFn: () => getTripDetail(supabase, tripId!),
    enabled: !!tripId,
  });
}
