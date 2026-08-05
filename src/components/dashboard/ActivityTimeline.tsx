// src/components/dashboard/ActivityTimeline.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { Clock, Route, Car } from 'lucide-react';

interface TripSession {
  user_id: string;
  started_at: string;
  driving_seconds: number;
  distance_m: number;
  fatigue_warnings: number;
}

export function ActivityTimeline() {
  const { crewId } = useCrew();
  const supabase = useSupabase();

  const tripsQuery = useQuery({
    queryKey: ['recentTrips', crewId],
    queryFn: async () => {
      if (!crewId) return [];
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from('crew_trip_sessions')
        .select('user_id, started_at, driving_seconds, distance_m, fatigue_warnings')
        .eq('crew_id', crewId)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as TripSession[];
    },
    enabled: !!crewId,
    refetchInterval: 60_000,
  });

  // Resolve display names for the user_ids in the trips.
  const userIds = [...new Set((tripsQuery.data ?? []).map((t) => t.user_id))];
  const profilesQuery = useQuery({
    queryKey: ['tripProfiles', crewId, userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        map[row.user_id] = (row as { display_name: string }).display_name;
      }
      return map;
    },
    enabled: userIds.length > 0,
  });

  const trips = tripsQuery.data ?? [];
  const names = profilesQuery.data ?? {};
  const isLoading = tripsQuery.isLoading;

  return (
    <div className="bg-surface border border-outline rounded-lg p-lg">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-[var(--brand-seed)]" aria-hidden="true" />
        <h2 className="font-heading font-bold text-sm text-on-surface">Recent Activity</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-container rounded-lg animate-pulse" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="py-8 text-center">
          <Car className="mx-auto h-8 w-8 text-on-surface-variant opacity-40" aria-hidden="true" />
          <p className="mt-2 text-sm text-on-surface-variant">No trips in the last 7 days</p>
          <p className="mt-1 text-xs text-on-surface-variant opacity-70">
            Trip activity will appear here as members start driving.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant">
          {trips.map((trip, i) => {
            const displayName = names[trip.user_id] || trip.user_id.slice(0, 8);
            const initial = displayName.charAt(0).toUpperCase();
            return (
              <div key={`${trip.user_id}-${trip.started_at}-${i}`} className="flex items-center gap-3 py-2.5">
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
                    {trip.distance_m > 0 && (
                      <span className="ml-2 inline-flex items-center gap-0.5">
                        <Route className="h-3 w-3" aria-hidden="true" />
                        {(trip.distance_m / 1000).toFixed(1)} km
                      </span>
                    )}
                    {trip.driving_seconds > 0 && (
                      <span className="ml-2">
                        {Math.round(trip.driving_seconds / 60)} min
                      </span>
                    )}
                  </p>
                </div>
                {trip.fatigue_warnings > 0 && (
                  <span className="shrink-0 rounded-full bg-warning-container px-2 py-0.5 text-[10px] font-semibold text-warning">
                    {trip.fatigue_warnings} alert{trip.fatigue_warnings > 1 ? 's' : ''}
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
