'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getCrewSettings } from '@/lib/rpc';

export function useCrewSettings(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['crewSettings', crewId],
    queryFn: () => getCrewSettings(supabase, crewId!),
    enabled: !!crewId,
  });
}
