'use client';

import { useQuery } from '@tanstack/react-query';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import type { CrewRanking } from '@/types/tier';

interface Distribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

function computeDistribution(rankings: CrewRanking[]): Distribution {
  const dist: Distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const r of rankings) {
    if (r.overallScore >= 80) dist.excellent++;
    else if (r.overallScore >= 60) dist.good++;
    else if (r.overallScore >= 40) dist.fair++;
    else dist.poor++;
  }
  return dist;
}

function bucketLabel(bucket: keyof Distribution, t: (k: string) => string): string {
  const map: Record<keyof Distribution, string> = {
    excellent: 'webFleetSafetyExcellent',
    good: 'webFleetSafetyGood',
    fair: 'webFleetSafetyFair',
    poor: 'webFleetSafetyPoor',
  };
  return t(map[bucket]);
}

const BUCKET_COLORS: Record<keyof Distribution, string> = {
  excellent: 'bg-success',
  good: 'bg-primary',
  fair: 'bg-warning',
  poor: 'bg-error',
};

export function FleetSafetyScore() {
  const { t } = useT();
  const { crewId } = useCrew();
  const supabase = useSupabase();

  const { data: rankings = [], isLoading } = useQuery({
    queryKey: ['fleetSafetyScore', crewId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_crew_rankings', {
        p_crew_id: crewId,
        p_days: 90,
      });
      if (error) throw error;
      return (data ?? []) as CrewRanking[];
    },
    enabled: !!crewId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-outline bg-surface p-sz-lg animate-pulse">
        <div className="h-4 w-32 bg-surface-container rounded mb-4" />
        <div className="h-20 bg-surface-container rounded" />
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="rounded-xl border border-outline bg-surface p-sz-lg text-center">
        <p className="text-sm text-on-surface-variant">{t('webFleetSafetyNoData')}</p>
      </div>
    );
  }

  const avgScore = rankings.reduce((sum, r) => sum + r.overallScore, 0) / rankings.length;
  const distribution = computeDistribution(rankings);
  const best = rankings[0]; // rankings are sorted by overallScore desc
  const worst = rankings[rankings.length - 1];

  return (
    <div className="rounded-xl border border-outline bg-surface p-sz-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-on-surface">{t('webFleetSafetyScoreTitle')}</h2>
          <p className="text-xs text-on-surface-variant">{t('webFleetSafetyScoreDesc')}</p>
        </div>
        <p className="text-xs text-on-surface-variant">
          {t('webFleetSafetyMembers', { count: rankings.length })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-sz-lg">
        {/* Average score */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface-container p-4">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            {t('webFleetSafetyAverage')}
          </span>
          <span
            className={`mt-1 text-4xl font-black ${
              avgScore >= 80 ? 'text-success' : avgScore >= 60 ? 'text-primary' : avgScore >= 40 ? 'text-warning' : 'text-error'
            }`}
          >
            {Math.round(avgScore)}
          </span>
          <span className="text-xs text-on-surface-variant">/ 100</span>
        </div>

        {/* Distribution bars */}
        <div className="md:col-span-2 space-y-2">
          {(Object.keys(distribution) as (keyof Distribution)[]).map((bucket) => {
            const count = distribution[bucket];
            const pct = (count / rankings.length) * 100;
            return (
              <div key={bucket} className="flex items-center gap-2">
                <span className="w-16 text-xs font-medium text-on-surface-variant shrink-0">
                  {bucketLabel(bucket, t)}
                </span>
                <div className="flex-1 h-5 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${BUCKET_COLORS[bucket]}`}
                    style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="w-6 text-xs text-on-surface-variant text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top / bottom performers */}
      <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant">
        <div className="text-xs">
          <span className="text-on-surface-variant">{t('webFleetSafetyHighest')}: </span>
          <span className="font-semibold text-success">{best.memberName}</span>
          <span className="ml-1 text-on-surface-variant">({Math.round(best.overallScore)})</span>
        </div>
        <div className="text-xs text-right">
          <span className="text-on-surface-variant">{t('webFleetSafetyLowest')}: </span>
          <span className="font-semibold text-error">{worst.memberName}</span>
          <span className="ml-1 text-on-surface-variant">({Math.round(worst.overallScore)})</span>
        </div>
      </div>
    </div>
  );
}
