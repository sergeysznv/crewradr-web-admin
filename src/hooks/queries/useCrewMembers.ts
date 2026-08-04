'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getCrewMembers } from '@/lib/rpc';
import { useState } from 'react';

export function useCrewMembers(crewId: string | null) {
  const supabase = useSupabase();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const query = useQuery({
    queryKey: ['crewMembers', crewId, search, offset],
    queryFn: () => getCrewMembers(supabase, crewId!, search || null, offset, limit),
    enabled: !!crewId,
  });

  return { ...query, search, setSearch, offset, setOffset, limit };
}
