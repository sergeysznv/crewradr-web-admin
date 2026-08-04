// src/components/dashboard/DashboardView.tsx
'use client';
import { useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { AppShell } from '@/components/shell/AppShell';
import { useCrew } from '@/hooks/useCrew';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';
import { useFleetDashboard } from '@/hooks/queries/useFleetDashboard';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { Skeleton } from '@/components/shared/Skeleton';

const FleetMap = nextDynamic(() => import('@/components/dashboard/FleetMap').then(m => ({ default: m.FleetMap })), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] md:h-full min-h-[240px] rounded-lg" />,
});

export function DashboardView() {
  const { crewId, setCrew, setCrews } = useCrew();
  const account = useAccountProfile();
  const dashboard = useFleetDashboard(crewId);

  // Sync crews from account profile on first load
  useEffect(() => {
    if (account.data?.crews && !crewId) {
      const crews = account.data.crews.map(c => ({ crew_id: c.crew_id, crew_name: c.crew_name, tier: c.tier, role: c.role }));
      setCrews(crews);
      if (crews.length > 0) setCrew(crews[0]);
    }
  }, [account.data, crewId, setCrew, setCrews]);

  return (
    <AppShell title="Fleet Dashboard">
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
    </AppShell>
  );
}
