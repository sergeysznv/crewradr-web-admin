// src/components/trips/TripsView.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useTripDetail } from '@/hooks/queries/useTripDetail';
import { TripTimeline } from '@/components/trips/TripTimeline';
import { RiskPredictionCard } from '@/components/ai/RiskPredictionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { tierRank } from '@/lib/utils';
import { Route, Lock, Loader2, TriangleAlert } from 'lucide-react';

export function TripsView() {
  const { t } = useT();
  const { tier } = useCrew();
  // Selection state stays placeholder-only until a trips list RPC exists;
  // the setter is deliberately unused for now (wired by a later task).
  const [selectedTripId] = useState<string | null>(null);
  const { data: trip, isLoading, isError, refetch } = useTripDetail(selectedTripId);

  // Tier gate — first mate+ (tier >= 1)
  if (tierRank(tier) < 1) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webTripsTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <h1 className="text-xl font-bold text-on-surface">{t('webTripsTitle')}</h1>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        {/* Trip list — placeholder; real implementation uses a trips list RPC */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-outline bg-surface p-lg">
            <h2 className="text-base font-semibold text-on-surface">{t('webTripsListTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webTripsSelectPrompt')}</p>
          </div>
        </div>

        {/* Trip detail */}
        <div className="lg:col-span-2">
          {trip ? (
            <>
              <TripTimeline trip={trip} />
              {/* Admiral tier: AI risk prediction — self-gates via AICard */}
              <RiskPredictionCard memberId={trip.memberId} />
            </>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-outline bg-surface p-12">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('webTripsLoading')}
                </div>
              ) : isError ? (
                <div className="text-center">
                  <TriangleAlert className="mx-auto h-8 w-8 text-error" aria-hidden="true" />
                  <p className="mt-2 text-sm text-on-surface-variant">{t('webTripsError')}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary"
                  >
                    {t('webRetry')}
                  </button>
                </div>
              ) : (
                <EmptyState
                  icon={<Route size={40} />}
                  title={t('webTripsNoTripSelected')}
                  message={t('webTripsNoTripSelectedDesc')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
