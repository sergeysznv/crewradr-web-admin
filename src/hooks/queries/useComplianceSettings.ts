'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getComplianceSettings, updateComplianceSettings } from '@/lib/rpc';
import type { ComplianceSettings } from '@/lib/rpc';

export function useComplianceSettings(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['complianceSettings', crewId],
    queryFn: () => getComplianceSettings(supabase, crewId!),
    enabled: !!crewId,
  });
}

export function useSaveComplianceSettings(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<ComplianceSettings>) =>
      updateComplianceSettings(supabase, { ...settings, crew_id: crewId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complianceSettings', crewId] });
    },
  });
}
