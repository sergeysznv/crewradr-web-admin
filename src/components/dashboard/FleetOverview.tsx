'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { getLivePositions } from '@/lib/rpc';
import { tierRank } from '@/lib/utils';
import { MapPin, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import type { FleetDashboard } from '@/types/rpc';

interface FleetOverviewProps {
  dashboard: FleetDashboard;
}

export function FleetOverview({ dashboard }: FleetOverviewProps) {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const supabase = useSupabase();
  const router = useRouter();
  const isAdmiral = tierRank(tier) >= 3;

  const positionsQuery = useQuery({
    queryKey: ['livePositions', crewId],
    queryFn: () => getLivePositions(supabase, crewId!),
    enabled: !!crewId && isAdmiral,
    refetchInterval: 60_000,
  });

  const onlineCount = positionsQuery.data?.length ?? null;
  const alertCount = dashboard.recent_alerts.length;

  return (
    <div className="bg-surface border border-outline rounded-lg p-lg flex flex-col justify-between min-h-[240px]">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-[var(--brand-seed)]" aria-hidden="true" />
          <h2 className="font-heading font-bold text-sm text-on-surface">
            {t('webMapTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Online</p>
            <p className="text-2xl font-bold text-on-surface">
              {isAdmiral
                ? onlineCount !== null
                  ? onlineCount
                  : '—'
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Alerts</p>
            <p className={`text-2xl font-bold ${alertCount > 0 ? 'text-red-500' : 'text-on-surface'}`}>
              {alertCount}
              {alertCount > 0 && (
                <AlertTriangle className="inline-block ml-1 h-4 w-4 text-red-500" aria-hidden="true" />
              )}
            </p>
          </div>
        </div>
      </div>

      {isAdmiral ? (
        <button
          onClick={() => router.push('/map')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-seed)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('webNavLiveMap')}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
          <Lock className="h-4 w-4" />
          {t('webUpgradeRequired')}
        </div>
      )}
    </div>
  );
}
