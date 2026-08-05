// src/components/members/Scorecard.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { useTier } from '@/hooks/useTier';
import { useT } from '@/hooks/use-translations';
import { tierHistoryDays } from '@/lib/tier';
import type { MemberScorecard } from '@/types/tier';

// Units match get_web_member_scorecard: braking = events per 100 miles,
// speeding/phone = events per trip, night = share of driving time.
const SUBSCORE_KEYS: Record<string, { labelKey: string; unit: string }> = {
  braking: { labelKey: 'webScorecardBraking', unit: 'events/100mi' },
  speeding: { labelKey: 'webScorecardSpeeding', unit: 'events/trip' },
  phoneUse: { labelKey: 'webScorecardPhoneUse', unit: 'events/trip' },
  nightDriving: { labelKey: 'webScorecardNightDriving', unit: '% of time' },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-error';
}

export function Scorecard({ memberId }: { memberId: string }) {
  const { t } = useT();
  const supabase = useSupabase();
  const { tier, settings } = useTier();
  // settings.historyDays is authoritative (snake_case tiers like 'first_mate'
  // are not keyed in tierHistoryDays); fall back to the tier ladder only
  // before settings have loaded.
  const days = settings?.historyDays ?? tierHistoryDays(tier);

  const { data, isLoading } = useQuery({
    queryKey: ['member_scorecard', memberId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_member_scorecard', {
        p_member_id: memberId,
        p_days: days,
      });
      if (error) throw error;
      return data as MemberScorecard;
    },
  });

  if (isLoading) {
    return <div className="animate-pulse rounded-xl bg-surface-container" style={{ height: 200 }} />;
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container p-6 text-center">
        <p className="text-sm text-on-surface-variant">{t('webScorecardNoData')}</p>
        <p className="mt-1 text-xs text-on-surface-variant/60">{t('webScorecardNoDataHint')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline bg-surface-container p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-on-surface">{data.memberName}</h3>
        <span className="text-xs text-on-surface-variant">{t('webScorecardPeriod', { days })}</span>
      </div>

      {/* Overall score */}
      <div className="mt-4 flex items-center gap-4">
        <span className={`text-5xl font-black leading-none ${scoreColor(data.overallScore)}`}>
          {Math.round(data.overallScore)}
        </span>
        <div>
          <span className="text-sm font-semibold text-on-surface">{t('webScorecardSafetyScore')}</span>
          <p className="text-xs text-on-surface-variant">
            {t('webScorecardPercentile', { percent: Math.round(100 - data.percentileRank) })}
          </p>
        </div>
      </div>

      {/* Subscores */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {Object.entries(data.subscores).map(([key, value]) => {
          const meta = SUBSCORE_KEYS[key] ?? { labelKey: key, unit: '' };
          return (
            <div key={key} className="rounded-lg bg-surface p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t(meta.labelKey)}</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold text-on-surface">{value}</span>
                <span className="text-xs text-on-surface-variant">{meta.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend sparkline */}
      {data.trend.length > 1 && (
        <div className="mt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('webScorecardTrend')}</span>
          <svg
            viewBox="0 0 100 40"
            className="mt-1 h-10 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={t('webScorecardTrendAria')}
          >
            <polyline
              points={data.trend
                .map((p, i) => `${(i / (data.trend.length - 1)) * 100},${(1 - p.score / 100) * 40}`)
                .join(' ')}
              fill="none"
              className="stroke-primary"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
