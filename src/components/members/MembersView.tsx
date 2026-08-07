// src/components/members/MembersView.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useCrewMembers } from '@/hooks/queries/useCrewMembers';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { useUpdateMemberRole } from '@/hooks/queries/useMutations';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { removeMember } from '@/lib/rpc';
import { tierRank } from '@/lib/utils';
import { MemberTable } from '@/components/members/MemberTable';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberDetail } from '@/components/members/MemberDetail';
import { CsvImportModal } from '@/components/members/CsvImportModal';
import { BulkActionBar } from '@/components/members/BulkActionBar';
import { PeerRanking } from '@/components/members/PeerRanking';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import { SlideOverPanel } from '@/components/shared/SlideOverPanel';
import { FilterChips } from '@/components/shared/FilterChips';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Search, Upload, Users, Lock } from 'lucide-react';
import type { CrewMember } from '@/types/rpc';

type RoleFilter = 'all' | 'captain' | 'co-captain' | 'member';

export function MembersView() {
  const { t } = useT();
  const { crewId, tier, role } = useCrew();

  // Tier gate — firstMate+ can view the roster (tier >= 1); write
  // controls below are gated to captain+ via TierGateGuard.
  if (tierRank(tier) < 1) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webMembersTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  const ROLE_FILTERS = [
    { value: 'all' as const, label: t('webMembersRoleAll') },
    { value: 'captain' as const, label: t('webMembersRoleCaptainLabel') },
    { value: 'co-captain' as const, label: t('webMembersRoleCoCaptainLabel') },
    { value: 'member' as const, label: t('webMembersRoleMemberLabel') },
  ];
  const supabase = useSupabase();
  const { showSuccess, showError } = useSnackbar();
  const updateRole = useUpdateMemberRole(crewId!);
  const { data, search, setSearch, offset, setOffset, limit, isLoading, isError, refetch } = useCrewMembers(crewId);
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkRemove, setShowBulkRemove] = useState(false);
  const [working, setWorking] = useState(false);

  // Realtime — reload members when crew membership changes.
  useRealtimeInvalidation(
    crewId,
    'admin-members',
    [{ table: 'crew_members', filter: `crew_id=eq.${crewId}` }],
    ['crewMembers', crewId!],
  );

  const members = data?.members ?? [];
  const filtered = roleFilter === 'all' ? members : members.filter(m => m.role === roleFilter);
  // Write controls (CSV import, bulk ops, selection) are captain+ tier AND
  // captain/co-captain role — the update_member_role / remove_member /
  // add_members RPCs reject plain members server-side.
  const canWrite = tierRank(tier) >= 2 &&
    (role === 'captain' || role === 'co-captain' || role === 'co_captain');

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(prev =>
      prev.size === filtered.length && filtered.length > 0
        ? new Set()
        : new Set(filtered.map(m => m.id)),
    );
  }

  function changeFilter(v: RoleFilter) {
    setRoleFilter(v);
    setSelectedIds(new Set());
  }

  async function bulkRemove() {
    const ids = [...selectedIds];
    setWorking(true);
    try {
      const results = await Promise.allSettled(ids.map(id => removeMember(supabase, id)));
      const failures = results.filter(r => r.status === 'rejected').length;
      const removed = ids.length - failures;
      if (failures > 0) showError(t('webMembersBulkRemoveFailed', { count: failures, plural: failures === 1 ? '' : 's' }));
      if (removed > 0) showSuccess(t('webMembersBulkRemoveSuccess', { count: removed, plural: removed === 1 ? '' : 's' }));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webMembersBulkRemoveError'));
    }
    setWorking(false);
    setSelectedIds(new Set());
    setShowBulkRemove(false);
  }

  async function bulkRoleChange(role: string) {
    const ids = [...selectedIds];
    setWorking(true);
    try {
      const results = await Promise.allSettled(
        ids.map(id => updateRole.mutateAsync({ memberId: id, newRole: role })),
      );
      const failures = results.filter(r => r.status === 'rejected').length;
      if (failures > 0) showError(t('webMembersBulkRoleChangeFailed', { count: failures, plural: failures === 1 ? '' : 's' }));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webMembersBulkRoleChangeError'));
    }
    setWorking(false);
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-sz-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface">{t('webMembersTitle')}</h1>
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
                placeholder={t('webMembersSearchPlaceholder')} className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline bg-surface text-sm" />
            </div>
          </div>
          <RoleGate>
            <TierGateGuard minTier="captain" fallback={null}>
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                <Upload size={14} /> {t('webMembersImportButton')}
              </button>
            </TierGateGuard>
          </RoleGate>
        </div>

        <FilterChips options={ROLE_FILTERS} selected={roleFilter} onSelect={changeFilter} />

        {/* Desktop table */}
        <div className="hidden md:block bg-surface border border-outline rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-sz-lg text-sm text-on-surface-variant">{t('webMembersLoading')}</div>
          ) : isError ? (
            <div className="p-sz-lg text-center">
              <p className="text-sm text-on-surface-variant">{t('webMembersFailedToLoad')}</p>
              <button onClick={() => refetch()} className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t('webSharedRetry')}</button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title={t('webMembersNoMembersFound')} message={t('webMembersNoMembersHint')} />
          ) : (
            <MemberTable
              members={filtered}
              total={data?.total ?? 0}
              offset={offset} limit={limit}
              onOffsetChange={setOffset}
              onRowClick={setSelected}
              {...(canWrite
                ? { selectedIds, onToggleSelect: toggleSelect, onToggleSelectAll: toggleSelectAll }
                : {})}
            />
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map(m => <MemberCard key={m.id} member={m} onClick={() => setSelected(m)} />)}
        </div>

        {/* Captain tier: crew-wide leaderboard (RPC ranks every member) */}
        <TierGateGuard minTier="captain" fallback={null}>
          {members.length > 0 && <PeerRanking crewId={crewId!} />}
        </TierGateGuard>

        <SlideOverPanel open={!!selected} onClose={() => setSelected(null)}>
          {selected && <MemberDetail member={selected} onClose={() => setSelected(null)} />}
        </SlideOverPanel>

        <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />

        <RoleGate>
          <TierGateGuard minTier="captain" fallback={null}>
            <BulkActionBar
              count={selectedIds.size}
              working={working}
              onRemove={() => setShowBulkRemove(true)}
              onRoleChange={bulkRoleChange}
              onClear={() => setSelectedIds(new Set())}
            />
          </TierGateGuard>
        </RoleGate>

        <ConfirmDialog
          key={showBulkRemove ? 'bulk-open' : 'bulk-closed'}
          open={showBulkRemove}
          title={t('webMembersRemoveDialogTitle')}
          message={t('webMembersRemoveDialogMessage', { name: `${selectedIds.size} selected member${selectedIds.size === 1 ? '' : 's'}` })}
          confirmLabel={t('webMembersRemove')}
          destructive
          pending={working}
          onConfirm={bulkRemove}
          onCancel={() => setShowBulkRemove(false)}
        />
      </div>
  );
}
