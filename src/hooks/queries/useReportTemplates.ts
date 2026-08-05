'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getReportTemplates, saveReportTemplate } from '@/lib/rpc';
import type { ReportWidget } from '@/types/tier';

export function useReportTemplates(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['reportTemplates', crewId],
    queryFn: () => getReportTemplates(supabase, crewId!),
    enabled: !!crewId,
  });
}

export function useSaveReportTemplate(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (template: { name: string; widgets: ReportWidget[] }) =>
      saveReportTemplate(supabase, crewId!, template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportTemplates', crewId] });
    },
  });
}
