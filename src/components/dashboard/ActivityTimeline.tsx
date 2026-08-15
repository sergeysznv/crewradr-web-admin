'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { getWebTripList } from '@/lib/rpc';
import { tierHistoryDays } from '@/lib/tier';
import { formatDistanceMeters } from '@/lib/units';
import { Clock, Route, Car, Info, ArrowUpRight } from 'lucide-react';
import type { TripListItem } from '@/types/tier';

export function ActivityTimeline({ days: daysOverride }: { days?: number }) {
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const { t } = useT();
  const { system } = useMeasurementSystem();
  const { settings, tier } = useTier();
  const days = daysOverride ?? settings?.historyDays ?? tierHistoryDays(tier);

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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
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
                  <TripAlertBadge count={trip.alert_count} tripId={trip.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TripAlertBadge({ count, tripId }: { count: number; tripId: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => router.push(`/trips?tripId=${tripId}`)}
        className="cursor-pointer rounded-full bg-warning-container px-2 py-0.5 text-[10px] font-semibold text-on-warning-container hover:bg-warning-container/85 hover:scale-105 active:scale-100 transition-all shadow-sm flex items-center gap-0.5"
      >
        <span>{count} alert{count > 1 ? 's' : ''}</span>
      </button>

      {hovered && (
        <div className="absolute z-30 bottom-[calc(100%+6px)] right-0 w-56 p-2.5 bg-zinc-950 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 rounded-lg shadow-xl text-[10px] leading-normal animate-fade-in pointer-events-none">
          <div className="font-semibold mb-1 flex items-center gap-1 text-zinc-200">
            <Info className="h-3 w-3 text-primary shrink-0" />
            Trip Alert Details
          </div>
          <p className="text-zinc-400 font-normal">
            This trip recorded {count} telemetry safety alert{count > 1 ? 's' : ''}.
          </p>
          <p className="mt-1.5 text-primary font-medium flex items-center gap-0.5">
            Click to view trip speed graph & details <ArrowUpRight className="h-2 w-2 shrink-0" />
          </p>
          <div className="absolute top-full right-4 w-1.5 h-1.5 bg-zinc-950 dark:bg-zinc-900 rotate-45 -mt-0.75 border-r border-b border-transparent dark:border-zinc-800" />
        </div>
      )}
    </div>
  );
}
