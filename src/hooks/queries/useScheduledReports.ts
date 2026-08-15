'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getScheduledReports, saveScheduledReport } from '@/lib/rpc';
import type { ScheduledReportInput } from '@/lib/rpc';

export function useScheduledReports(crewId: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['scheduledReports', crewId],
    queryFn: () => getScheduledReports(supabase, crewId!),
    enabled: !!crewId,
  });
}

export function useSaveScheduledReport(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (schedule: ScheduledReportInput) =>
      saveScheduledReport(supabase, crewId!, schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports', crewId] });
    },
  });
}

export function useDeleteScheduledReport(crewId: string | null) {
  const supabase = useSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enterprise_scheduled_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduledReports', crewId] });
    },
  });
}
