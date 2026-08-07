// src/components/dashboard/ActivityTimeline.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { getWebTripList } from '@/lib/rpc';
import { tierHistoryDays } from '@/lib/tier';
import { formatDistanceMeters } from '@/lib/units';
import { Clock, Route, Car } from 'lucide-react';
import type { TripListItem } from '@/types/tier';

export function ActivityTimeline() {
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const { t } = useT();
  const { system } = useMeasurementSystem();
  const { settings, tier } = useTier();
  const days = settings?.historyDays ?? tierHistoryDays(tier);

  const tripsQuery = useQuery({
    queryKey: ['recentTrips', crewId, days],
    queryFn: () => getWebTripList(supabase, crewId!, days),
    enabled: !!crewId,
    refetchInterval: 60_000,
  });

  const trips: TripListItem[] = tripsQuery.data ?? [];
  const isLoading = tripsQuery.isLoading;
  const isError = tripsQuery.isError;

  return (
    <div className="bg-surface border border-outline rounded-lg p-sz-lg">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-[var(--brand-seed)]" aria-hidden="true" />
        <h2 className="font-heading font-bold text-sm text-on-surface">{t('webFleetRecentActivity')}</h2>
      </div>

      {isError ? (
        <div className="py-8 text-center">
          <p className="text-xs text-error">{t('webErrorLoading')}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-container rounded-lg animate-pulse" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="py-8 text-center">
          <Car className="mx-auto h-8 w-8 text-on-surface-variant opacity-40" aria-hidden="true" />
          <p className="mt-2 text-sm text-on-surface-variant">{t('webFleetNoRecentTrips')}</p>
          <p className="mt-1 text-xs text-on-surface-variant opacity-70">
            {t('webFleetNoRecentTripsDesc')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant">
          {trips.map((trip, i) => {
            const displayName = trip.member_name || trip.member_id.slice(0, 8);
            const initial = displayName.charAt(0).toUpperCase();
            return (
              <div key={`${trip.id}-${i}`} className="flex items-center gap-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(trip.started_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(trip.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {trip.distance_miles > 0 && (
                      <span className="ml-2 inline-flex items-center gap-0.5">
                        <Route className="h-3 w-3" aria-hidden="true" />
                        {formatDistanceMeters(trip.distance_miles * 1609.34, system)}
                      </span>
                    )}
                    {trip.duration_min > 0 && (
                      <span className="ml-2">
                        {trip.duration_min} {t('webFleetMin')}
                      </span>
                    )}
                  </p>
                </div>
                {trip.alert_count > 0 && (
                  <span className="shrink-0 rounded-full bg-warning-container px-2 py-0.5 text-[10px] font-semibold text-warning">
                    {t('webFleetAlertsCount', { count: trip.alert_count, plural: trip.alert_count > 1 ? 's' : '' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
