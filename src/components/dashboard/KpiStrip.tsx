// src/components/dashboard/KpiStrip.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { StatTile } from '@/components/shared/StatTile';
import type { FleetDashboard } from '@/types/rpc';

export function KpiStrip({ data }: { data: FleetDashboard }) {
  const { crewId } = useCrew();
  const supabase = useSupabase();

  // Trips started today
  const todayQuery = useQuery({
    queryKey: ['tripsToday', crewId],
    queryFn: async () => {
      if (!crewId) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('crew_trip_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('crew_id', crewId)
        .gte('started_at', startOfDay.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!crewId,
    refetchInterval: 60_000,
  });

  const criticalAlerts = data.recent_alerts.filter((a) => a.severity === 'critical').length;
  const warningAlerts = data.recent_alerts.filter((a) => a.severity === 'warning').length;
  const safetyScore = Math.max(0, 100 - criticalAlerts * 20 - warningAlerts * 10);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-lg">
      <StatTile label="Fleet Size" value={data.member_count} />
      <StatTile label="Active Now" value={data.active_trips} />
      <StatTile
        label="Alerts (24h)"
        value={data.recent_alerts.length}
        trend={data.recent_alerts.length > 0 ? `${data.recent_alerts.length} open` : 'All clear'}
        trendUp={data.recent_alerts.length > 0 ? false : undefined}
      />
      <StatTile
        label="Trips Today"
        value={todayQuery.isLoading ? '…' : todayQuery.data ?? '—'}
      />
      <StatTile
        label="Safety Score"
        value={safetyScore}
        trend={safetyScore >= 80 ? 'Good' : safetyScore >= 50 ? 'Fair' : 'Poor'}
        trendUp={safetyScore >= 80 ? true : safetyScore >= 50 ? undefined : false}
      />
    </div>
  );
}
