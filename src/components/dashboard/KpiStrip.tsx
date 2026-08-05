// src/components/dashboard/KpiStrip.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { StatTile } from '@/components/shared/StatTile';
import type { FleetDashboard } from '@/types/rpc';

export function KpiStrip({ data }: { data: FleetDashboard }) {
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const { t } = useT();

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
      <StatTile label={t('webFleetFleetSize')} value={data.member_count} />
      <StatTile label={t('webFleetActiveNow')} value={data.active_trips} />
      <StatTile
        label={t('webFleetAlerts24h')}
        value={data.recent_alerts.length}
        trend={data.recent_alerts.length > 0 ? t('webFleetAlertsCount', { count: data.recent_alerts.length, plural: 's' }) : t('webFleetAllClear')}
        trendUp={data.recent_alerts.length > 0 ? false : undefined}
      />
      <StatTile
        label={t('webFleetTripsToday')}
        value={todayQuery.isLoading ? '…' : todayQuery.data ?? '—'}
      />
      <StatTile
        label={t('webFleetSafetyScore')}
        value={safetyScore}
        trend={safetyScore >= 80 ? t('webFleetGood') : safetyScore >= 50 ? t('webFleetFair') : t('webFleetPoor')}
        trendUp={safetyScore >= 80 ? true : safetyScore >= 50 ? undefined : false}
      />
    </div>
  );
}
