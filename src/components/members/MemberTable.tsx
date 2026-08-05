// src/components/members/MemberTable.tsx
import { DataTable } from '@/components/shared/DataTable';
import { StatusDot, type Status } from '@/components/shared/StatusDot';
import { useT } from '@/hooks/use-translations';
import type { CrewMember } from '@/types/rpc';

function statusFromTrips(trips: number): Status {
  if (trips > 0) return 'active';
  return 'offline';
}

export function MemberTable({ members, total, offset, limit, onOffsetChange, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: {
  members: CrewMember[];
  total: number; offset: number; limit: number;
  onOffsetChange: (o: number) => void;
  onRowClick: (m: CrewMember) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}) {
  const { t } = useT();
  const columns = [
    {
      key: 'name', header: t('webMembersColMember'),
      render: (m: CrewMember) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : m.profile_emoji ? (
              <span className="text-sm leading-none">{m.profile_emoji}</span>
            ) : (
              (m.display_name ?? m.email ?? '?')[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="font-semibold text-sm text-on-surface">{m.display_name ?? t('webFleetUnknown')}</div>
            <div className="text-2xs text-on-surface-variant">{m.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: t('webMembersColRole'),
      render: (m: CrewMember) => (
        <span className="px-2 py-0.5 rounded-xl text-2xs font-semibold bg-secondary-container text-on-surface">
          {m.role}
        </span>
      ),
    },
    {
      key: 'status', header: t('webMembersColStatus'),
      render: (m: CrewMember) => (
        <div className="flex items-center gap-1.5">
          <StatusDot status={statusFromTrips(m.trips_30d)} />
          <span className="text-xs text-on-surface-variant">{m.trips_30d > 0 ? t('webMembersStatusActive') : t('webMembersStatusOffline')}</span>
        </div>
      ),
    },
    {
      key: 'trips', header: t('webMembersColTrips'),
      render: (m: CrewMember) => <span className="text-sm text-on-surface">{m.trips_30d}</span>,
    },
    {
      key: 'joined', header: t('webMembersColJoined'),
      render: (m: CrewMember) => <span className="text-xs text-on-surface-variant">{new Date(m.joined_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={members}
      pagination={{ offset, limit, total, onPageChange: onOffsetChange }}
      onRowClick={onRowClick}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
    />
  );
}
