'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getAlertRules, saveAlertRule } from '@/lib/rpc';
import type { AlertRule } from '@/types/tier';

export function useAlertRules(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['alertRules', crewId],
    queryFn: () => getAlertRules(supabase, crewId!),
    enabled: !!crewId,
  });
}

export function useSaveAlertRule(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (rule: { id?: string; name: string; conditions: AlertRule['conditions']; enabled: boolean }) =>
      saveAlertRule(supabase, crewId!, rule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertRules', crewId] });
    },
  });
}
