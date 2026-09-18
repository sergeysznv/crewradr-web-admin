'use client';

import { useEffect, useRef, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { getLivePositions } from '@/lib/rpc';
import { formatRelativeTime, tierRank } from '@/lib/utils';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatSpeedMps } from '@/lib/units';
import { MapPin, X, AlertTriangle, Loader2, Lock, ShieldCheck, CloudRain } from 'lucide-react';
import type { LivePosition } from '@/types/rpc';
import type { GeofenceZone } from '@/components/map/live-map';

const LiveMap = nextDynamic(() => import('@/components/map/live-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
    </div>
  ),
});

const STALE_AFTER_MS = 15 * 60 * 1000;

function getMovementMode(speedMs: number | null | undefined, eventType?: string | null): { mode: string; emoji: string; label: string } {
  if (eventType === 'flying') return { mode: 'flying', emoji: '✈️', label: 'Flying' };
  if (eventType === 'driving') return { mode: 'driving', emoji: '🚗', label: 'Driving' };
  if (eventType === 'cycling') return { mode: 'cycling', emoji: '🚴', label: 'Cycling' };
  if (eventType === 'running') return { mode: 'running', emoji: '🏃', label: 'Running' };
  if (eventType === 'walking') return { mode: 'walking', emoji: '🚶', label: 'Walking' };

  if (speedMs == null || speedMs <= 0.5) {
    return { mode: 'stationary', emoji: '🛑', label: 'Stationary' };
  }
  if (speedMs <= 2.2) {
    return { mode: 'walking', emoji: '🚶', label: 'Walking' };
  }
  if (speedMs <= 6.0) {
    return { mode: 'running', emoji: '🏃', label: 'Running' };
  }
  if (speedMs <= 10.0) {
    return { mode: 'cycling', emoji: '🚴', label: 'Cycling' };
  }
  if (speedMs <= 70.0) {
    return { mode: 'driving', emoji: '🚗', label: 'Driving' };
  }
  return { mode: 'flying', emoji: '✈️', label: 'Flying' };
}

export function MapView() {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const { system } = useMeasurementSystem();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const isPaidTier = tierRank(tier) >= 1;
  const [showZones, setShowZones] = useState(true);
  const [showRadar, setShowRadar] = useState(false);

  const positionsQuery = useQuery({
    queryKey: ['livePositions', crewId],
    queryFn: () => getLivePositions(supabase, crewId!),
    enabled: !!crewId && isPaidTier,
    refetchInterval: tierRank(tier) >= 2 ? 15_000 : 30_000,
  });

  const zonesQuery = useQuery({
    queryKey: ['savedPlaces', crewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_places')
        .select('id, name, latitude, longitude, radius_m, category, emoji')
        .order('name');
      if (error) return [];
      return (data ?? []).map((z: any) => ({
        id: String(z.id),
        name: String(z.name || 'Safe Landing'),
        latitude: Number(z.latitude),
        longitude: Number(z.longitude),
        radiusM: Number(z.radius_m ?? 75),
        category: z.category ? String(z.category) : undefined,
        emoji: z.emoji ? String(z.emoji) : undefined,
      })) as GeofenceZone[];
    },
    enabled: !!crewId && isPaidTier,
  });

  const [selected, setSelected] = useState<LivePosition | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  const positions = positionsQuery.data ?? [];
  const zones = zonesQuery.data ?? [];

  // Realtime — instant marker upsert + 5s RPC reconcile (ported from production).
  useEffect(() => {
    if (!crewId || !isPaidTier) return;
    let reconcileTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReconcile = () => {
      if (reconcileTimer) clearTimeout(reconcileTimer);
      reconcileTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['livePositions', crewId] });
      }, 5000);
    };
    const channel = supabase
      .channel(`live-map-${crewId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_logs', filter: `crew_id=eq.${crewId}` },
        (payload) => {
          const rec = (payload as { new?: Record<string, unknown> }).new;
          if (rec && typeof rec.user_id === 'string' && typeof rec.latitude === 'number' && typeof rec.longitude === 'number') {
            const userId = rec.user_id;
            const lat = rec.latitude;
            const lng = rec.longitude;
            const createdAt = String(rec.created_at ?? new Date().toISOString());
            const eventType = typeof rec.event_type === 'string' ? rec.event_type : null;
            const speedMs = typeof rec.speed_ms === 'number' ? rec.speed_ms : null;
            queryClient.setQueryData<LivePosition[]>(['livePositions', crewId], (prev) => {
              const list = prev ?? [];
              const exists = list.some((p) => p.user_id === userId);
              if (exists) {
                return list.map((p) =>
                  p.user_id === userId
                    ? {
                        ...p,
                        latitude: lat,
                        longitude: lng,
                        created_at: createdAt,
                        speed_ms: speedMs ?? p.speed_ms,
                        is_stale: false,
                        last_seen_at: createdAt,
                      }
                    : p,
                );
              }
              return [
                ...list,
                {
                  user_id: userId,
                  latitude: lat,
                  longitude: lng,
                  created_at: createdAt,
                  speed_ms: speedMs,
                  is_stale: false,
                  last_seen_at: createdAt,
                  display_name: 'Crew Member',
                  role: 'member',
                  profile_emoji: null,
                  avatar_url: null,
                  event_type: eventType,
                },
              ];
            });
            scheduleReconcile();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members', filter: `crew_id=eq.${crewId}` },
        () => queryClient.invalidateQueries({ queryKey: ['livePositions', crewId] }),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
      if (reconcileTimer) clearTimeout(reconcileTimer);
    };
  }, [crewId, isPaidTier, supabase, queryClient]);

  // Refetch on tab focus — skip if refreshed recently to prevent double-fetch.
  const lastFocusRef = useRef<number>(0);
  useEffect(() => {
    if (lastFocusRef.current === 0) lastFocusRef.current = Date.now();
    const onFocus = () => {
      if (Date.now() - lastFocusRef.current > 5000) {
        lastFocusRef.current = Date.now();
        queryClient.invalidateQueries({ queryKey: ['livePositions', crewId] });
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFocusRef.current > 5000) {
        lastFocusRef.current = Date.now();
        queryClient.invalidateQueries({ queryKey: ['livePositions', crewId] });
      }
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [crewId, queryClient]);

  const lastUpdated = positionsQuery.dataUpdatedAt;

  // ── Tier gate ──
  if (!isPaidTier) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webMapTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  if (positionsQuery.isLoading) {
    return (
      <div className="space-y-sz-lg animate-fade-in" role="status" aria-label={t('webMapLoadingAria')}>
        <div className="h-8 w-48 bg-surface-container rounded-lg animate-pulse" />
        <div className="h-[calc(100vh-12rem)] min-h-[480px] rounded-xl bg-surface-container animate-pulse" />
      </div>
    );
  }

  if (positionsQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
          <p className="mt-2 text-sm text-on-surface-variant">{t('webMapFailed')}</p>
          <button
            onClick={() => positionsQuery.refetch()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // Staleness uses the query's dataUpdatedAt as "now" (refreshes with the
  // 30s refetchInterval) so render stays pure.
  const selectedIsStale =
    selected &&
    selected.created_at &&
    positionsQuery.dataUpdatedAt > 0 &&
    positionsQuery.dataUpdatedAt - new Date(selected.created_at).getTime() > STALE_AFTER_MS;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <header className="flex flex-wrap items-center gap-3 pb-2">
        <h1 className="text-2xl font-bold text-on-surface">{t('webMapTitle')}</h1>
        <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-on-primary-container">
          {t('webMapMembersTracked', { count: positions.length })}
        </span>
        <button
          type="button"
          onClick={() => setShowZones((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            showZones
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-outline text-on-surface-variant hover:bg-surface-container'
          }`}
          title={zones.length === 0 ? 'No Safe Landings configured for this crew' : `${zones.length} Safe Landings`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Safe Landings ({zones.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setShowRadar((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            showRadar
              ? 'border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
              : 'border-outline text-on-surface-variant hover:bg-surface-container'
          }`}
          title="Live Precipitation Radar (First Mate+)"
        >
          <CloudRain className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span>Weather Radar</span>
        </button>
        {lastUpdated > 0 && (
          <span className="ml-auto text-xs text-on-surface-variant">
            {t('webMapUpdated', { time: formatRelativeTime(new Date(lastUpdated).toISOString(), t) })}
          </span>
        )}
      </header>

      <div className="relative mt-sz-lg flex-1">
        <div className="h-[calc(100vh-12rem)] min-h-[480px] overflow-hidden rounded-xl border border-outline bg-surface-container shadow-sm">
          <LiveMap
            positions={positions}
            selectedUserId={selected?.user_id ?? null}
            onSelect={setSelected}
            onError={(err) => setMapLoadError(err.message)}
            zones={zones}
            showZones={showZones}
            showRadar={showRadar}
          />
          {mapLoadError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border border-outline bg-surface-container" role="alert">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
                <p className="mt-2 text-sm text-on-surface-variant">{t('webMapFailed')}</p>
                <p className="mt-1 text-xs text-on-surface-variant opacity-70">{mapLoadError}</p>
              </div>
            </div>
          )}
          {positions.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border border-outline bg-surface-container" role="status">
              <div className="text-center">
                <MapPin className="mx-auto h-10 w-10 text-on-surface-variant opacity-40" aria-hidden="true" />
                <p className="mt-2 text-sm text-on-surface-variant">{t('webMapNoPositions')}</p>
                <p className="mt-1 text-xs text-on-surface-variant opacity-70">{t('webMapNoPositionsDesc')}</p>
              </div>
            </div>
          )}
          {positions.length > 0 && positions.every((p) => p.is_stale) && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-[1100] rounded-lg border border-outline bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
              {t('webMapAllStale')}
            </div>
          )}
        </div>

        {selected && (
          <aside className="absolute bottom-3 left-3 z-[1100] w-72 rounded-xl border border-outline bg-surface p-4 shadow-sm">
            <button
              onClick={() => setSelected(null)}
              aria-label={t('webMapCloseAria')}
              className="absolute right-2 top-2 rounded p-1 text-on-surface-variant hover:bg-surface-container"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              {selected.avatar_url ? (
                <img
                  src={selected.avatar_url}
                  alt={selected.display_name ?? ''}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {selected.profile_emoji || selected.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-on-surface">{selected.display_name}</p>
                <p className="text-xs text-on-surface-variant">{selected.user_id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface">
                <span>{getMovementMode(selected.speed_ms, selected.event_type).emoji}</span>
                <span>{getMovementMode(selected.speed_ms, selected.event_type).label}</span>
              </span>
              {selected.speed_ms != null && selected.speed_ms > 0 && (
                <span className="rounded-md bg-primary-container px-2 py-0.5 text-xs font-semibold text-on-primary-container">
                  {formatSpeedMps(selected.speed_ms, system)}
                </span>
              )}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <dt className="sr-only">{t('webMapLastSeen')}</dt>
              <dd className="text-on-surface-variant">
                {selected.created_at
                  ? t('webMapLastSeen', { time: formatRelativeTime(selected.created_at, t) })
                  : t('webMapNeverSeen')}
              </dd>
              {selected.latitude != null && selected.longitude != null && (
                <dd className="text-xs text-on-surface-variant">
                  {t('webMapCoordinates')}: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                </dd>
              )}
              {selected.speed_ms != null && selected.speed_ms > 0 && (
                <dd className="text-xs text-on-surface-variant">
                  {t('webTripsSpeed')}: {formatSpeedMps(selected.speed_ms, system)}
                </dd>
              )}
              {selected.last_seen_at && selected.is_stale && (
                <dd className="text-xs text-warning">
                  {t('webMapStale', { minutes: 15 })}
                </dd>
              )}
              {!selected.last_seen_at && (
                <dd className="text-xs text-error">{t('webMapNoRecentFix')}</dd>
              )}
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}
