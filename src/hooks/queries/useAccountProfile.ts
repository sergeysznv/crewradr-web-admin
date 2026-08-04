'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getAccountProfile } from '@/lib/rpc';

export function useAccountProfile() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['accountProfile'],
    queryFn: () => getAccountProfile(supabase),
  });
}
