'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { getAccountProfile } from '@/lib/rpc';

export function useAccountProfile() {
  const supabase = useSupabase();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return useQuery({
    queryKey: ['accountProfile'],
    queryFn: () => getAccountProfile(supabase),
    enabled: hasSession === true,
  });
}
