'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { updateMemberRole, bulkImportMembers, removeMember } from '@/lib/rpc';
import { useSnackbar } from '@/components/shared/Snackbar';

export function useUpdateMemberRole(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { t } = useT();

  return useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: string }) =>
      updateMemberRole(supabase, memberId, newRole),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      showSuccess(t('webMutationRoleChanged', { role: data.new_role }));
    },
    onError: () => showError(t('webMutationRoleChangeFailed')),
  });
}

export function useRemoveMember(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { t } = useT();

  return useMutation({
    mutationFn: (memberId: string) => removeMember(supabase, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      showSuccess(t('webMutationMemberRemoved'));
    },
    onError: () => showError(t('webMutationRemoveFailed')),
  });
}

export function useBulkImport(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { t } = useT();

  return useMutation({
    mutationFn: (members: Array<{ email: string; role: string }>) =>
      bulkImportMembers(supabase, crewId, members),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      const msg = data.errors.length > 0
        ? t('webMutationMembersImported', { added: String(data.added), errors: String(data.errors.length) })
        : t('webMutationMembersImportedNoErrors', { added: String(data.added) });
      showSuccess(msg);
    },
    onError: () => showError(t('webMutationImportFailed')),
  });
}

export function useResolveSafetyAlert(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { t } = useT();

  return useMutation({
    mutationFn: async ({ alertId, resolutionNotes }: { alertId: string; resolutionNotes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated');

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const resolvedBy = profile?.id || null;

      const { data, error } = await supabase
        .from('safety_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleetDashboard', crewId] });
      showSuccess(t('webAlertResolved') || 'Alert successfully resolved');
    },
    onError: (e: any) => {
      showError(t('webAlertResolveFailed') || `Failed to resolve alert: ${e.message}`);
    },
  });
}
