// src/components/dashboard/DashboardView.tsx
'use client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCrew } from '@/hooks/useCrew';
import { useT } from '@/hooks/use-translations';
import { useFleetDashboard } from '@/hooks/queries/useFleetDashboard';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { AnomalyCard } from '@/components/ai/AnomalyCard';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { FleetOverview } from '@/components/dashboard/FleetOverview';
import { CalendarHeatmap } from '@/components/overview/CalendarHeatmap';
import { TrendChart } from '@/components/overview/TrendChart';
import { FleetSafetyScore } from '@/components/dashboard/FleetSafetyScore';
import { Skeleton } from '@/components/shared/Skeleton';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';

export function DashboardView() {
  // Crew seeding happens once at app mount in CrewLoader — not per page.
  const { crewId } = useCrew();
  const { t } = useT();
  const dashboard = useFleetDashboard(crewId);

  // Realtime — silent background refresh on trip session / safety alert changes.
  useRealtimeInvalidation(
    crewId,
    'fleet-dashboard',
    [
      { table: 'crew_trip_sessions', filter: `crew_id=eq.${crewId}` },
      { table: 'safety_alerts', event: 'INSERT', filter: `crew_id=eq.${crewId}` },
    ],
    ['fleetDashboard'],
  );

  return (
    <>
      {dashboard.isLoading ? (
        <div className="space-y-sz-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          <Skeleton className="h-[320px] rounded-lg" />
        </div>
      ) : dashboard.data ? (
        <div className="space-y-sz-lg animate-fade-in">
          <h1 className="text-2xl font-bold text-on-surface">{t('webNavFleet')}</h1>
          <KpiStrip data={dashboard.data} />
          {/* Fleet-wide aggregate safety score (captain+ tier) */}
          <TierGateGuard minTier="captain" fallback={null}>
            <FleetSafetyScore />
          </TierGateGuard>
          {/* Trends — one card per metric, tier-clamped history window */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sz-lg">
            <TrendChart metric="miles" crewId={crewId!} label={t('webOverviewTrendMiles')} />
            <TrendChart metric="hours" crewId={crewId!} label={t('webOverviewTrendHours')} />
            <TrendChart metric="alerts" crewId={crewId!} label={t('webOverviewTrendAlerts')} />
          </div>
          {/* Weekly activity + live map */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sz-lg">
            <div className="md:col-span-1"><CalendarHeatmap crewId={crewId!} /></div>
            <div className="md:col-span-2"><FleetOverview dashboard={dashboard.data} /></div>
          </div>
          <AlertFeed alerts={dashboard.data.recent_alerts} />
          {/* Admiral tier: AI anomaly feed — self-gates via AICard */}
          <AnomalyCard />
          <ActivityTimeline />
          {/* Captain+ tier AND captain/co-captain role: custom alert rules
              (save_alert_rule is role-gated server-side) */}
          <RoleGate>
            <TierGateGuard minTier="captain" fallback={null}>
              <section className="space-y-sz-md">
                <h2 className="font-heading text-base font-bold text-on-surface">{t('webAlertsRulesTitle')}</h2>
                <AlertRuleBuilder />
              </section>
            </TierGateGuard>
          </RoleGate>
        </div>
      ) : dashboard.isError ? (
        <div className="flex items-center justify-center py-24" role="status">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-on-surface-variant">{t('webErrorLoading')}</p>
            <button onClick={() => dashboard.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
