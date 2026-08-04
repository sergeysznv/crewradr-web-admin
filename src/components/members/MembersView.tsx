// src/components/members/MembersView.tsx
'use client';
import { useState } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { useCrewMembers } from '@/hooks/queries/useCrewMembers';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { MemberTable } from '@/components/members/MemberTable';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberDetail } from '@/components/members/MemberDetail';
import { CsvImportModal } from '@/components/members/CsvImportModal';
import { SlideOverPanel } from '@/components/shared/SlideOverPanel';
import { FilterChips } from '@/components/shared/FilterChips';
import { EmptyState } from '@/components/shared/EmptyState';
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
  const { crewId } = useCrew();
  const { data, search, setSearch, offset, setOffset, limit, isLoading } = useCrewMembers(crewId);
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showImport, setShowImport] = useState(false);

  // Realtime — reload members when crew membership changes.
  useRealtimeInvalidation(
    crewId,
    'admin-members',
    [{ table: 'crew_members' }],
    ['crewMembers', crewId!],
  );

  const members = data?.members ?? [];
  const filtered = roleFilter === 'all' ? members : members.filter(m => m.role === roleFilter);

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

        <FilterChips options={ROLE_FILTERS} selected={roleFilter} onSelect={setRoleFilter} />

        {/* Desktop table */}
        <div className="hidden md:block bg-surface border border-outline rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-lg text-sm text-on-surface-variant">Loading...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title="No members found" message="Try adjusting your search or filters." />
          ) : (
            <MemberTable
              members={filtered}
              total={data?.total ?? 0}
              offset={offset} limit={limit}
              onOffsetChange={setOffset}
              onRowClick={setSelected}
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

        {/* BulkActionBar is intentionally not rendered: bulk selection has no
            checkboxes yet. The component is kept as a reserved component. */}
        <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />
      </div>
  );
}
