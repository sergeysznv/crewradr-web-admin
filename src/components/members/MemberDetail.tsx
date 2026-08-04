// src/components/members/MemberDetail.tsx
'use client';
import type { CrewMember } from '@/types/rpc';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/queries/useMutations';
import { useCrew } from '@/hooks/useCrew';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useState } from 'react';

export function MemberDetail({ member, onClose }: { member: CrewMember; onClose: () => void }) {
  const { crewId } = useCrew();
  const updateRole = useUpdateMemberRole(crewId!);
  const removeMember = useRemoveMember(crewId!);
  const [showRemove, setShowRemove] = useState(false);

  function handleRemove() {
    removeMember.mutate(member.id, { onSuccess: () => { setShowRemove(false); onClose(); } });
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold text-primary">
          {(member.display_name ?? member.email ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-heading font-extrabold text-lg text-on-surface">{member.display_name ?? 'Unknown'}</h2>
          <p className="text-sm text-on-surface-variant">{member.email}</p>
        </div>
      </div>

      <div className="bg-surface-container rounded-lg p-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">Role</span>
          <span className="text-sm font-semibold text-on-surface">{member.role}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">Joined</span>
          <span className="text-sm text-on-surface">{new Date(member.joined_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">Trips (30d)</span>
          <span className="text-sm text-on-surface">{member.trips_30d}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Change Role</label>
        <div className="flex gap-2">
          {['member', 'co-captain'].map(role => (
            <button key={role} disabled={role === member.role}
              onClick={() => updateRole.mutate({ memberId: member.id, newRole: role })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border
                ${role === member.role ? 'bg-primary-container text-primary border-primary/30' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}>
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-lg border-t border-outline-variant">
        <button onClick={() => setShowRemove(true)}
          className="w-full px-4 py-2 rounded-xl border border-error/30 text-error text-sm font-semibold hover:bg-error-container">
          Remove from Crew
        </button>
      </div>

      {/* Removal requires typing the member's exact name; keyed per-open so
          the verify input resets every time the dialog is shown. */}
      <ConfirmDialog
        key={showRemove ? 'remove-open' : 'remove-closed'}
        open={showRemove}
        title="Remove Member"
        message={`Remove ${member.display_name ?? member.email} from the crew? This action cannot be undone.`}
        confirmLabel="Remove"
        destructive
        pending={removeMember.isPending}
        verifyText={{
          match: member.display_name ?? member.email ?? '',
          placeholder: member.display_name ?? member.email ?? '',
          label: `Type ${member.display_name ?? 'the member name'} to confirm`,
        }}
        onConfirm={handleRemove}
        onCancel={() => setShowRemove(false)}
      />
    </div>
  );
}
