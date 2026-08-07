// src/components/settings/DangerZone.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useAuth } from '@/hooks/use-auth';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { transferCaptaincy, dissolveCrew, removeMember } from '@/lib/rpc';
import { Loader2 } from 'lucide-react';
import type { CrewMember } from '@/types/rpc';

export function DangerZone() {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const { user } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showSuccess, showError } = useSnackbar();

  const [showTransfer, setShowTransfer] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const isCaptain = tier === 'captain';

  // Fetch members for the transfer picker
  const membersQuery = useQuery({
    queryKey: ['crewMembersForTransfer', crewId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_crew_members', {
        p_crew_id: crewId!, p_search: null, p_offset: 0, p_limit: 100,
      });
      if (error) throw error;
      const resp = data as unknown as { members: CrewMember[] };
      return resp.members ?? [];
    },
    enabled: showTransfer && !!crewId,
  });

  const members = membersQuery.data ?? [];
  const eligibleMembers = useMemo(
    () => members.filter((m) => m.user_id !== user?.id),
    [members, user?.id],
  );

  async function handleTransfer() {
    if (!crewId || !transferTarget) return;
    setWorking(true);
    try {
      await transferCaptaincy(supabase, crewId, transferTarget);
      showSuccess(t('webSettingsTransferSuccess'));
      setShowTransfer(false);
      setTransferTarget(null);
      queryClient.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      router.refresh();
    } catch {
      showError(t('webSettingsTransferFailed'));
    }
    setWorking(false);
  }

  async function handleLeave() {
    if (!crewId || !user) return;
    setWorking(true);
    try {
      const { data, error } = await supabase
        .from('crew_members')
        .select('id')
        .eq('crew_id', crewId)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      const row = data as { id: string };
      await removeMember(supabase, row.id);
      showSuccess(t('webSettingsLeaveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['crewMembers', crewId] });
      router.push('/fleet');
    } catch {
      showError(t('webSettingsLeaveFailed'));
    }
    setWorking(false);
    setShowLeave(false);
  }

  async function handleDelete() {
    if (!crewId) return;
    setWorking(true);
    try {
      await dissolveCrew(supabase, crewId);
      showSuccess(t('webSettingsDeleteSuccess'));
      router.push('/');
    } catch {
      showError(t('webSettingsDeleteFailed'));
    }
    setWorking(false);
    setShowDelete(false);
  }

  return (
    <div className="border border-error/20 rounded-lg p-sz-lg space-y-4">
      <h3 className="font-heading font-bold text-sm text-error">{t('webSettingsDangerZoneTitle')}</h3>

      {/* Transfer Ownership */}
      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsTransferOwnership')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsTransferHint')}</div>
        </div>
        <button
          onClick={() => setShowTransfer(true)}
          disabled={!isCaptain}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('webSettingsTransferButton')}
        </button>
      </div>

      {/* Leave Crew */}
      <div className="flex items-center justify-between py-2 border-b border-outline-variant">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsLeaveCrew')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsLeaveHint')}</div>
        </div>
        <button
          onClick={() => setShowLeave(true)}
          disabled={isCaptain}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-error/30 text-error hover:bg-error-container disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('webSettingsLeaveButton')}
        </button>
      </div>

      {/* Delete Crew */}
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsDeleteCrew')}</div>
          <div className="text-xs text-on-surface-variant">{t('webSettingsDeleteHint')}</div>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          disabled={!isCaptain}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('webSettingsDeleteButton')}
        </button>
      </div>

      {/* Transfer Dialog */}
      <ConfirmDialog
        open={showTransfer}
        title={t('webSettingsTransferOwnership')}
        message={t('webSettingsTransferDialogMessage')}
        confirmLabel={t('webSettingsTransferButton')}
        destructive
        pending={working}
        confirmDisabled={!transferTarget}
        onConfirm={handleTransfer}
        onCancel={() => { setShowTransfer(false); setTransferTarget(null); }}
      >
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto rounded-lg border border-outline p-1">
          {membersQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
            </div>
          ) : eligibleMembers.length === 0 ? (
            <p className="px-3 py-4 text-xs text-on-surface-variant text-center">{t('webSettingsTransferNoMembers')}</p>
          ) : (
            eligibleMembers.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${
                  transferTarget === m.user_id
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="transferTarget"
                  value={m.user_id}
                  checked={transferTarget === m.user_id}
                  onChange={() => setTransferTarget(m.user_id)}
                  className="sr-only"
                />
                <span className="flex-1">{m.display_name ?? m.email ?? m.user_id.slice(0, 8)}</span>
                <span className="text-xs text-on-surface-variant capitalize">{m.role}</span>
              </label>
            ))
          )}
        </div>
      </ConfirmDialog>

      {/* Leave Dialog */}
      <ConfirmDialog
        open={showLeave}
        title={t('webSettingsLeaveCrew')}
        message={t('webSettingsLeaveHint')}
        confirmLabel={t('webSettingsLeaveButton')}
        destructive
        pending={working}
        onConfirm={handleLeave}
        onCancel={() => setShowLeave(false)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDelete}
        title={t('webSettingsDeleteCrew')}
        message={t('webSettingsDeleteHint')}
        confirmLabel={t('webSettingsDeleteButton')}
        destructive
        pending={working}
        verifyText={{
          match: 'delete',
          placeholder: 'delete',
          label: t('webSettingsDeleteVerifyLabel'),
        }}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
