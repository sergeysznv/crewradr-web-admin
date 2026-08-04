// src/components/dashboard/DashboardView.tsx
'use client';
import nextDynamic from 'next/dynamic';
import { useCrew } from '@/hooks/useCrew';
import { useFleetDashboard } from '@/hooks/queries/useFleetDashboard';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { Skeleton } from '@/components/shared/Skeleton';

const FleetMap = nextDynamic(() => import('@/components/dashboard/FleetMap').then(m => ({ default: m.FleetMap })), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] md:h-full min-h-[240px] rounded-lg" />,
});

export function DashboardView() {
  // Crew seeding happens once at app mount in CrewLoader — not per page.
  const { crewId } = useCrew();
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
        <div className="space-y-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          <Skeleton className="h-[320px] rounded-lg" />
        </div>
      ) : dashboard.data ? (
        <div className="space-y-lg">
          <KpiStrip data={dashboard.data} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="md:col-span-2"><FleetMap /></div>
            <div className="md:col-span-1"><AlertFeed alerts={dashboard.data.recent_alerts} /></div>
          </div>
          <ActivityTimeline />
        </div>
      ) : null}
    </>
  );
}
