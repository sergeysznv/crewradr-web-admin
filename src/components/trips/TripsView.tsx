// src/components/trips/TripsView.tsx
'use client';
import { useState } from 'react';
import { useT, isImperial } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useTripList } from '@/hooks/queries/useTripList';
import { useTripDetail } from '@/hooks/queries/useTripDetail';
import { TripTimeline } from '@/components/trips/TripTimeline';
import { RiskPredictionCard } from '@/components/ai/RiskPredictionCard';
import { ETACard } from '@/components/ai/ETACard';
import { EmptyState } from '@/components/shared/EmptyState';
import { tierRank } from '@/lib/utils';
import { tierHistoryDays } from '@/lib/tier';
import type { CrewTier } from '@/types/tier';
import { Route, Lock, Loader2, TriangleAlert, MapPin } from 'lucide-react';

export function TripsView() {
  const { t } = useT();
  const { tier, crewId } = useCrew();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  // Days requested = the tier's full history window; the RPC clamps it
  // server-side (7/30/90/365) in case of pending downgrades.
  const { data: trips, isLoading: isListLoading, isError: isListError, refetch: refetchList } =
    useTripList(crewId, tierHistoryDays(tier as CrewTier));
  const { data: trip, isLoading, isError, refetch } = useTripDetail(selectedTripId);

  const distanceLabel = (miles: number) =>
    isImperial()
      ? t('webTripsMiles', { n: miles < 10 ? miles.toFixed(1) : Math.round(miles) })
      : t('webTripsKm', { n: Math.round(miles * 1.60934) });

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
    <div className="space-y-sz-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface">{t('webTripsTitle')}</h1>

      <div className="grid grid-cols-1 gap-sz-lg lg:grid-cols-3">
        {/* Trip list */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-outline bg-surface p-sz-lg">
            <h2 className="text-base font-semibold text-on-surface">{t('webTripsListTitle')}</h2>

            {isListLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('webTripsLoading')}
              </div>
            ) : isListError ? (
              <div className="py-8 text-center">
                <TriangleAlert className="mx-auto h-6 w-6 text-error" aria-hidden="true" />
                <p className="mt-2 text-sm text-on-surface-variant">{t('webTripsListError')}</p>
                <button
                  onClick={() => refetchList()}
                  className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary"
                >
                  {t('webRetry')}
                </button>
              </div>
            ) : !trips?.length ? (
              <EmptyState
                icon={<Route size={32} />}
                title={t('webTripsNoTrips')}
                message={t('webTripsSelectPrompt')}
              />
            ) : (
              <ul className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto pr-1">
                {trips.map((tr) => (
                  <li key={tr.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTripId(tr.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        tr.id === selectedTripId
                          ? 'border-primary bg-primary-container/60'
                          : 'border-transparent hover:border-outline hover:bg-surface-variant'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-on-surface">
                          {tr.member_name || t('webTripsMember')}
                        </span>
                        <span className="shrink-0 text-xs text-on-surface-variant">
                          {new Date(tr.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {distanceLabel(tr.distance_miles)}
                          {tr.duration_min > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              {t('webTripsDurationMin', { n: tr.duration_min })}
                            </>
                          )}
                        </span>
                        {tr.alert_count > 0 && (
                          <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
                            {t('webTripsAlertCount', { n: tr.alert_count })}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Trip detail */}
        <div className="lg:col-span-2">
          {trip ? (
            <>
              <TripTimeline trip={trip} />
              {/* Admiral tier: AI risk prediction — self-gates via AICard */}
              <RiskPredictionCard memberId={trip.memberId} />
              {/* Admiral tier: AI arrival prediction — live trips only */}
              {trip.isLive && <ETACard memberId={trip.memberId} />}
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
