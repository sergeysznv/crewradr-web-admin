// src/components/members/MemberDetail.tsx
'use client';

import type { CrewMember } from '@/types/rpc';
import { useQuery } from '@tanstack/react-query';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/queries/useMutations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatDistanceMeters } from '@/lib/units';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import { Scorecard } from '@/components/members/Scorecard';
import { RiskPredictionCard } from '@/components/ai/RiskPredictionCard';
import { ETACard } from '@/components/ai/ETACard';
import { useState } from 'react';
import { Route, Clock, AlertTriangle } from 'lucide-react';

interface MemberTrip {
  started_at: string;
  driving_seconds: number;
  distance_m: number;
}

export function MemberDetail({ member, onClose }: { member: CrewMember; onClose: () => void }) {
  const { t } = useT();
  const { system } = useMeasurementSystem();
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const updateRole = useUpdateMemberRole(crewId!);
  const removeMember = useRemoveMember(crewId!);
  const [showRemove, setShowRemove] = useState(false);

  // Recent trips for this member
  const tripsQuery = useQuery({
    queryKey: ['memberTrips', crewId, member.user_id],
    queryFn: async () => {
      if (!crewId) return [];
      const { data, error } = await supabase
        .from('crew_trip_sessions')
        .select('started_at, driving_seconds, distance_m')
        .eq('crew_id', crewId)
        .eq('user_id', member.user_id)
        .order('started_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as MemberTrip[];
    },
    enabled: !!crewId,
  });

  const trips = tripsQuery.data ?? [];

  function handleRemove() {
    removeMember.mutate(member.id, { onSuccess: () => { setShowRemove(false); onClose(); } });
  }

  return (
    <div className="space-y-sz-lg">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-xl font-bold text-on-primary-container overflow-hidden">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : member.profile_emoji ? (
            <span className="text-2xl leading-none">{member.profile_emoji}</span>
          ) : (
            (member.display_name ?? member.email ?? '?')[0].toUpperCase()
          )}
        </div>
        <div>
          <h2 className="font-heading font-extrabold text-lg text-on-surface">{member.display_name ?? t('webFleetUnknown')}</h2>
          <p className="text-sm text-on-surface-variant">{member.email}</p>
        </div>
      </div>

      <div className="bg-surface-container rounded-lg p-sz-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">{t('webMembersDetailRole')}</span>
          <span className="text-sm font-semibold text-on-surface">{member.role}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">{t('webMembersDetailJoined')}</span>
          <span className="text-sm text-on-surface">{new Date(member.joined_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-on-surface-variant">{t('webMembersDetailTrips')}</span>
          <span className="text-sm text-on-surface">{member.trips_30d}</span>
        </div>
      </div>

      {/* Captain tier: safety scorecard */}
      <TierGateGuard minTier="captain" fallback={null}>
        <Scorecard memberId={member.id} />
      </TierGateGuard>

      {/* Admiral tier: AI risk prediction — self-gates via AICard */}
      <RiskPredictionCard memberId={member.user_id} />

      {/* Admiral tier: AI arrival prediction — self-gates via AICard */}
      <ETACard memberId={member.user_id} />

      {/* Recent trips */}
      <div>
        <h3 className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          <Route className="h-3.5 w-3.5" />
          {t('webMembersDetailRecentTrips')}
        </h3>
        {tripsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-surface-container rounded-lg animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">{t('webMembersDetailNoTrips')}</p>
        ) : (
          <div className="divide-y divide-outline-variant">
            {trips.map((trip, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                  <span className="text-xs text-on-surface">
                    {new Date(trip.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span>{Math.round(trip.driving_seconds / 60)} {t('webMembersDetailMin')}</span>
                  {trip.distance_m > 0 && <span>{formatDistanceMeters(trip.distance_m, system)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Captain+ tier AND captain/co-captain role: role change + removal
          (update_member_role / remove_member are role-gated server-side) */}
      <RoleGate>
      <TierGateGuard minTier="captain" fallback={null}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webMembersDetailChangeRole')}</label>
          <div className="flex gap-2">
            {['member', 'co-captain'].map(role => (
              <button key={role} disabled={role === member.role}
                onClick={() => updateRole.mutate({ memberId: member.id, newRole: role })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border
                  ${role === member.role ? 'bg-primary-container text-on-primary-container border-outline' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}>
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-sz-lg border-t border-outline-variant">
          <button onClick={() => setShowRemove(true)}
            className="w-full px-4 py-2 rounded-xl border border-error/30 text-error text-sm font-semibold hover:bg-error-container">
            {t('webMembersRemoveFromCrew')}
          </button>
        </div>
      </TierGateGuard>
      </RoleGate>

      <ConfirmDialog
        key={showRemove ? 'remove-open' : 'remove-closed'}
        open={showRemove}
        title={t('webMembersRemoveDialogTitle')}
        message={t('webMembersRemoveDialogMessage', { name: member.display_name ?? member.email ?? '' })}
        confirmLabel={t('webMembersRemove')}
        destructive
        pending={removeMember.isPending}
        verifyText={{
          match: member.display_name ?? member.email ?? '',
          placeholder: member.display_name ?? member.email ?? '',
          label: t('webMembersVerifyHint', { name: member.display_name ?? member.email ?? '' }),
        }}
        onConfirm={handleRemove}
        onCancel={() => setShowRemove(false)}
      />
    </div>
  );
}
