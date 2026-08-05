// src/components/members/MemberCard.tsx
import { StatusDot, type Status } from '@/components/shared/StatusDot';
import { useT } from '@/hooks/use-translations';
import type { CrewMember } from '@/types/rpc';

function statusFromTrips(trips: number): Status {
  return trips > 0 ? 'active' : 'offline';
}

export function MemberCard({ member, onClick }: { member: CrewMember; onClick: () => void }) {
  const { t } = useT();
  return (
    <div onClick={onClick}
      className="bg-surface border border-outline rounded-lg p-md flex items-center gap-3 cursor-pointer hover:bg-surface-container transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          (member.display_name ?? member.email ?? '?')[0].toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-on-surface truncate">{member.display_name ?? t('webFleetUnknown')}</div>
        <div className="text-2xs text-on-surface-variant truncate">{member.email}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="px-2 py-0.5 rounded-xl text-2xs font-semibold bg-secondary-container text-on-surface">{member.role}</span>
        <StatusDot status={statusFromTrips(member.trips_30d)} />
      </div>
    </div>
  );
}
