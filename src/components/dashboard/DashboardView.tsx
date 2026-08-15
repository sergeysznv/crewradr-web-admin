// src/components/dashboard/DashboardView.tsx
'use client';
import { useState } from 'react';
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
import { FilterChips } from '@/components/shared/FilterChips';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';

type TimeRange = 1 | 7 | 15 | 30 | 60 | 90;

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 15, label: '15d' },
  { value: 30, label: '30d' },
  { value: 60, label: '60d' },
  { value: 90, label: '90d' },
];

export function DashboardView() {
  // Crew seeding happens once at app mount in CrewLoader — not per page.
  const { crewId } = useCrew();
  const { t } = useT();
  const [days, setDays] = useState<TimeRange>(30);
  const dashboard = useFleetDashboard(crewId, days);

  // Realtime — silent background refresh on trip session / safety alert changes.
  useRealtimeInvalidation(
    crewId,
    'fleet-dashboard',
    [
      { table: 'crew_trip_sessions', filter: `crew_id=eq.${crewId}` },
      { table: 'safety_alerts', filter: `crew_id=eq.${crewId}` },
    ],
    ['fleetDashboard'],
  );

  return (
    <>
      {dashboard.isLoading ? (
        <div className="space-y-sz-lg max-w-7xl mx-auto py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-[320px] rounded-lg" />
        </div>
      ) : dashboard.data ? (
        <div className="space-y-sz-lg animate-fade-in max-w-7xl mx-auto py-6">
          {/* Header section with page title & date filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sz-md border-b border-outline-variant/30 pb-sz-md">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">{t('webNavFleet')}</h1>
              <p className="text-xs text-on-surface-variant mt-1">Real-time status, safety scores, and driving logs for your fleet.</p>
            </div>
            <div className="shrink-0">
              <FilterChips<TimeRange> options={TIME_RANGES} selected={days} onSelect={setDays} />
            </div>
          </div>

          {/* Key Metrics KPI Grid */}
          <KpiStrip data={dashboard.data} />

          {/* Section 1: Fleet Safety & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-sz-lg">
            {/* Fleet safety distribution */}
            <div className="lg:col-span-1">
              <TierGateGuard minTier="captain" fallback={null}>
                <FleetSafetyScore days={days} />
              </TierGateGuard>
            </div>
            {/* Active alerts feed */}
            <div className="lg:col-span-2">
              <AlertFeed alerts={dashboard.data.recent_alerts} />
            </div>
          </div>

          {/* Section 2: AI Anomaly detection (Admiral tier) */}
          <AnomalyCard />

          {/* Section 3: Metric Trends */}
          <section className="space-y-sz-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-on-surface tracking-tight">Performance & Safety Trends</h2>
              <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-full">Synced to selector</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-sz-lg">
              <TrendChart metric="miles" crewId={crewId!} label={t('webOverviewTrendMiles')} days={days} />
              <TrendChart metric="hours" crewId={crewId!} label={t('webOverviewTrendHours')} days={days} />
              <TrendChart metric="alerts" crewId={crewId!} label={t('webOverviewTrendAlerts')} days={days} />
            </div>
          </section>

          {/* Section 4: Live tracking, heatmap and activity list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-sz-lg">
            {/* Map link and weekly heatmap */}
            <div className="lg:col-span-1 space-y-sz-lg">
              <FleetOverview dashboard={dashboard.data} />
              <CalendarHeatmap crewId={crewId!} />
            </div>
            {/* Live activity feed */}
            <div className="lg:col-span-2">
              <ActivityTimeline days={days} />
            </div>
          </div>

          {/* Section 5: Custom alert rule builder */}
          <RoleGate>
            <TierGateGuard minTier="captain" fallback={null}>
              <section className="space-y-sz-md border-t border-outline-variant/30 pt-sz-lg">
                <h2 className="font-heading text-base font-bold text-on-surface">{t('webAlertsRulesTitle')}</h2>
                <AlertRuleBuilder />
              </section>
            </TierGateGuard>
          </RoleGate>
        </div>
      ) : dashboard.isError ? (
        <div className="flex items-center justify-center py-24" role="status">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
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
