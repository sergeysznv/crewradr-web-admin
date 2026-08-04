// src/components/dashboard/KpiStrip.tsx
import { StatTile } from '@/components/shared/StatTile';
import type { FleetDashboard } from '@/types/rpc';

export function KpiStrip({ data }: { data: FleetDashboard }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-lg">
      <StatTile label="Fleet Size" value={data.member_count} trend="+3 this mo" trendUp />
      <StatTile label="Active Now" value={data.active_trips} />
      <StatTile label="Alerts (24h)" value={data.recent_alerts.length} trend={data.recent_alerts.length > 0 ? `${data.recent_alerts.length} open` : 'All clear'} trendUp={data.recent_alerts.length > 0 ? false : undefined} />
      <StatTile label="Trips Today" value="—" />
      <StatTile label="Safety Score" value="—" />
    </div>
  );
}
