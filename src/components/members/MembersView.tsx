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
import { MemberTable } from '@/components/members/MemberTable';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberDetail } from '@/components/members/MemberDetail';
import { CsvImportModal } from '@/components/members/CsvImportModal';
import { BulkActionBar } from '@/components/members/BulkActionBar';
import { SlideOverPanel } from '@/components/shared/SlideOverPanel';
import { FilterChips } from '@/components/shared/FilterChips';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Search, Upload, Users } from 'lucide-react';
import type { CrewMember } from '@/types/rpc';

const ROLE_FILTERS = [
  { value: 'all' as const, label: 'All Roles' },
  { value: 'captain' as const, label: 'Captain' },
  { value: 'co-captain' as const, label: 'Co-Captain' },
  { value: 'member' as const, label: 'Member' },
];

type RoleFilter = 'all' | 'captain' | 'co-captain' | 'member';

export function MembersView() {
  const { t } = useT();
  const { crewId } = useCrew();
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
    [{ table: 'crew_members' }],
    ['crewMembers', crewId!],
  );

  const members = data?.members ?? [];
  const filtered = roleFilter === 'all' ? members : members.filter(m => m.role === roleFilter);

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
    <div className="space-y-lg">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Search members..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline bg-surface text-sm" />
            </div>
          </div>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
            <Upload size={14} /> Import CSV
          </button>
        </div>

        <FilterChips options={ROLE_FILTERS} selected={roleFilter} onSelect={changeFilter} />

        {/* Desktop table */}
        <div className="hidden md:block bg-surface border border-outline rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-lg text-sm text-on-surface-variant">Loading...</div>
          ) : isError ? (
            <div className="p-lg text-center">
              <p className="text-sm text-on-surface-variant">Failed to load members</p>
              <button onClick={() => refetch()} className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title="No members found" message="Try adjusting your search or filters." />
          ) : (
            <MemberTable
              members={filtered}
              total={data?.total ?? 0}
              offset={offset} limit={limit}
              onOffsetChange={setOffset}
              onRowClick={setSelected}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map(m => <MemberCard key={m.id} member={m} onClick={() => setSelected(m)} />)}
        </div>

        <SlideOverPanel open={!!selected} onClose={() => setSelected(null)}>
          {selected && <MemberDetail member={selected} onClose={() => setSelected(null)} />}
        </SlideOverPanel>

        <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />

        <BulkActionBar
          count={selectedIds.size}
          working={working}
          onRemove={() => setShowBulkRemove(true)}
          onRoleChange={bulkRoleChange}
          onClear={() => setSelectedIds(new Set())}
        />

        <ConfirmDialog
          key={showBulkRemove ? 'bulk-open' : 'bulk-closed'}
          open={showBulkRemove}
          title="Remove Members"
          message={`Remove ${selectedIds.size} selected member${selectedIds.size === 1 ? '' : 's'} from the crew? This action cannot be undone.`}
          confirmLabel="Remove"
          destructive
          pending={working}
          onConfirm={bulkRemove}
          onCancel={() => setShowBulkRemove(false)}
        />
      </div>
  );
}
