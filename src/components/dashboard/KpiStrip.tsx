// src/components/dashboard/KpiStrip.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT, formatDistance } from '@/hooks/use-translations';
import { StatTile } from '@/components/shared/StatTile';
import type { FleetDashboard } from '@/types/rpc';

const HOURS_FORMAT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function KpiStrip({ data }: { data: FleetDashboard }) {
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const { t } = useT();
  const { trip_stats: ts, total_alert_count } = data;

  // Trips started today (UTC midnight — matches server current_date)
  const todayQuery = useQuery({
    queryKey: ['tripsToday', crewId],
    queryFn: async () => {
      if (!crewId) return 0;
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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

  const avgScore = ts.avg_score;
  const safetyScore = avgScore != null ? Math.round(avgScore) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-sz-lg">
      <StatTile
        label={t('webFleetFleetSize')}
        value={data.member_count}
        href="/members"
        tooltip={t('webFleetFleetSizeTooltip')}
      />
      <StatTile
        label={t('webFleetActiveNow')}
        value={data.active_trips}
        tone={data.active_trips > 0 ? 'good' : 'neutral'}
        href="/map"
        tooltip={t('webFleetActiveNowTooltip')}
      />
      <StatTile
        label={t('webFleetTotalDistance')}
        value={formatDistance(ts.total_distance_km)}
        href="/reports"
        tooltip={t('webFleetTotalDistanceTooltip')}
      />
      <StatTile
        label={t('webFleetDrivingHours')}
        value={HOURS_FORMAT.format(ts.total_driving_hours)}
        href="/reports"
        tooltip={t('webFleetDrivingHoursTooltip')}
      />
      <StatTile
        label={t('webFleetRecentAlerts')}
        value={total_alert_count}
        tone={total_alert_count > 0 ? 'bad' : 'good'}
        href="/compliance"
        tooltip={t('webFleetRecentAlertsTooltip')}
      />
      <StatTile
        label={t('webFleetTripsToday')}
        value={todayQuery.isLoading ? '…' : todayQuery.data ?? '—'}
        tone={!todayQuery.isLoading && todayQuery.data != null && todayQuery.data > 0 ? 'good' : 'neutral'}
        href="/trips"
        tooltip={t('webFleetTripsTodayTooltip')}
      />
      <StatTile
        label={t('webFleetSafetyScore')}
        value={safetyScore != null ? safetyScore : '—'}
        tone={safetyScore != null ? (safetyScore >= 80 ? 'good' : safetyScore >= 50 ? 'neutral' : 'bad') : 'neutral'}
        href="/reports"
        tooltip={t('webFleetSafetyScoreTooltip')}
      />
    </div>
  );
}
