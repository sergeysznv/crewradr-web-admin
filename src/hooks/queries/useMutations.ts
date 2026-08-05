'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { updateMemberRole, bulkImportMembers, removeMember } from '@/lib/rpc';
import { useSnackbar } from '@/components/shared/Snackbar';

export function useUpdateMemberRole(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  return useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: string }) =>
      updateMemberRole(supabase, memberId, newRole),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      showSuccess(`Role changed to ${data.new_role}`); // matches webMembersRoleChanged
    },
    onError: (err: Error) => showError(err.message),
  });
}

export function useRemoveMember(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  return useMutation({
    mutationFn: (memberId: string) => removeMember(supabase, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      showSuccess('Member removed');
    },
    onError: (err: Error) => showError(err.message),
  });
}

export function useBulkImport(crewId: string) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  return useMutation({
    mutationFn: (members: Array<{ email: string; role: string }>) =>
      bulkImportMembers(supabase, crewId, members),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      showSuccess(`${data.added} members imported${data.errors.length ? `, ${data.errors.length} errors` : ''}`);
    },
    onError: (err: Error) => showError(err.message),
  });
}
