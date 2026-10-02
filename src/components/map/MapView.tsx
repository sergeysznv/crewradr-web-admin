'use client';

import { useEffect, useRef, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { getLivePositions } from '@/lib/rpc';
import { formatRelativeTime, tierRank } from '@/lib/utils';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatSpeedMps } from '@/lib/units';
import {
  MapPin,
  X,
  AlertTriangle,
  Loader2,
  Lock,
  ShieldCheck,
  CloudRain,
  Cloud,
  Plus,
  Trash2,
  Check,
  Unlock,
  Clock,
  RotateCcw,
  Archive,
} from 'lucide-react';
import type { LivePosition, AccountProfile } from '@/types/rpc';
import type { GeofenceZone, NwsHazardAlert, DraftZoneState } from '@/components/map/live-map';
import { useCrewKey } from '@/hooks/useCrewKey';
import { decryptPayload } from '@/lib/crypto';
import { ZeroKnowledgeUnlockModal } from '@/components/shared/ZeroKnowledgeUnlockModal';
import { extractMeshAttribution } from '@/lib/meshAttribution';
import { MeshRelayBadge } from '@/components/shared/MeshRelayBadge';
import { useJurisdiction } from '@/lib/jurisdiction';

const LiveMap = nextDynamic(() => import('@/components/map/live-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
    </div>
  ),
});

const STALE_AFTER_MS = 15 * 60 * 1000;

const DAYS_OF_WEEK = [
  { day: 1, label: 'M', full: 'Mon' },
  { day: 2, label: 'T', full: 'Tue' },
  { day: 3, label: 'W', full: 'Wed' },
  { day: 4, label: 'T', full: 'Thu' },
  { day: 5, label: 'F', full: 'Fri' },
  { day: 6, label: 'S', full: 'Sat' },
  { day: 7, label: 'S', full: 'Sun' },
];

function getRetentionRemaining(deletedAtIso: string): string {
  const deletedAt = new Date(deletedAtIso).getTime();
  const expiresAt = deletedAt + 7 * 24 * 60 * 60 * 1000;
  const msRemaining = expiresAt - Date.now();
  if (msRemaining <= 0) return 'Expiring now';
  const days = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d remaining`;
  const hours = Math.floor(msRemaining / (60 * 60 * 1000));
  return `${hours}h remaining`;
}

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
  const { isUS } = useJurisdiction();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const isPaidTier = tierRank(tier) >= 1;
  const isCaptain = tierRank(tier) >= 2;
  const [showZones, setShowZones] = useState(true);
  const [showRadar, setShowRadar] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [showHazards, setShowHazards] = useState(true);
  const [hazardCount, setHazardCount] = useState(0);
  const [selectedHazard, setSelectedHazard] = useState<NwsHazardAlert | null>(null);

  // Safe Landings Geofence CRUD state
  const [isPlacingZone, setIsPlacingZone] = useState(false);
  const [selectedZone, setSelectedZone] = useState<GeofenceZone | null>(null);
  const [draftZone, setDraftZone] = useState<DraftZoneState | null>(null);
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false);
  const [zoneEditorMode, setZoneEditorMode] = useState<'create' | 'edit'>('create');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('custom');
  const [formEmoji, setFormEmoji] = useState('📍');
  const [formRadius, setFormRadius] = useState(100);
  const [formWeatherAlerts, setFormWeatherAlerts] = useState(true);
  const [formScheduleEnabled, setFormScheduleEnabled] = useState(false);
  const [formScheduleStart, setFormScheduleStart] = useState('08:00');
  const [formScheduleEnd, setFormScheduleEnd] = useState('17:00');
  const [formScheduleDays, setFormScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);
  const [isSubmittingZone, setIsSubmittingZone] = useState(false);
  const { crewKey, hasCrewKey } = useCrewKey();
  const [zkModalOpen, setZkModalOpen] = useState(false);
  const [positions, setPositions] = useState<LivePosition[]>([]);

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
        .select('id, name, latitude, longitude, radius_m, category, emoji, weather_alerts_enabled, schedule_enabled, schedule_start, schedule_end, schedule_days, deleted_at')
        .is('deleted_at', null)
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
        weatherAlertsEnabled: Boolean(z.weather_alerts_enabled ?? true),
        scheduleEnabled: Boolean(z.schedule_enabled ?? false),
        scheduleStart: z.schedule_start ? String(z.schedule_start) : '08:00',
        scheduleEnd: z.schedule_end ? String(z.schedule_end) : '17:00',
        scheduleDays: Array.isArray(z.schedule_days) ? z.schedule_days : [1, 2, 3, 4, 5],
        deletedAt: z.deleted_at ?? null,
      })) as GeofenceZone[];
    },
    enabled: !!crewId && isPaidTier,
  });

  const recycleBinQuery = useQuery({
    queryKey: ['savedPlacesRecycleBin', crewId],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('saved_places')
        .select('id, name, latitude, longitude, radius_m, category, emoji, deleted_at')
        .not('deleted_at', 'is', null)
        .gte('deleted_at', sevenDaysAgo)
        .order('deleted_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        radius_m: number;
        category?: string;
        emoji?: string;
        deleted_at: string;
      }>;
    },
    enabled: !!crewId && isPaidTier,
  });

  const [selected, setSelected] = useState<LivePosition | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  const zones = zonesQuery.data ?? [];
  const recycleBinItems = recycleBinQuery.data ?? [];

  useEffect(() => {
    let active = true;
    async function resolveZeroKnowledge() {
      const raw = positionsQuery.data ?? [];
      if (!crewKey) {
        setPositions(raw);
        return;
      }
      const updated = await Promise.all(
        raw.map(async (p) => {
          if (p.encrypted_payload) {
            const dec = await decryptPayload(p.encrypted_payload, crewKey);
            if (dec) {
              return {
                ...p,
                latitude: dec.latitude,
                longitude: dec.longitude,
                speed_ms: dec.speed ?? p.speed_ms,
              };
            }
          }
          return p;
        })
      );
      if (active) setPositions(updated);
    }
    resolveZeroKnowledge();
    return () => {
      active = false;
    };
  }, [positionsQuery.data, crewKey]);

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
          if (rec && typeof rec.user_id === 'string') {
            (async () => {
              let lat = typeof rec.latitude === 'number' ? rec.latitude : null;
              let lng = typeof rec.longitude === 'number' ? rec.longitude : null;
              let speedMs = typeof rec.speed_ms === 'number' ? rec.speed_ms : null;
              const encrypted = typeof rec.encrypted_payload === 'string' ? rec.encrypted_payload : null;

              if (encrypted && crewKey) {
                const dec = await decryptPayload(encrypted, crewKey);
                if (dec) {
                  lat = dec.latitude;
                  lng = dec.longitude;
                  speedMs = dec.speed ?? speedMs;
                }
              }

              if (lat === null || lng === null) return;

              const userId = String(rec.user_id);
              const createdAt = String(rec.created_at ?? new Date().toISOString());
              const eventType = typeof rec.event_type === 'string' ? rec.event_type : null;
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
                          encrypted_payload: encrypted ?? p.encrypted_payload,
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
                    encrypted_payload: encrypted,
                  },
                ];
              });
              scheduleReconcile();
            })();
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

  // Geofence & Hazard Handlers
  const startPlacingZone = () => {
    setSelected(null);
    setSelectedHazard(null);
    setSelectedZone(null);
    setZoneEditorOpen(false);
    setIsPlacingZone(true);
    showSuccess('Click anywhere on the map to set Safe Landing location.');
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setIsPlacingZone(false);
    setDraftZone({
      latitude: coords.lat,
      longitude: coords.lng,
      radiusM: 100,
    });
    setFormName(`Safe Landing ${zones.length + 1}`);
    setFormCategory('custom');
    setFormEmoji('📍');
    setFormRadius(100);
    setFormWeatherAlerts(true);
    setFormScheduleEnabled(false);
    setFormScheduleStart('08:00');
    setFormScheduleEnd('17:00');
    setFormScheduleDays([1, 2, 3, 4, 5]);
    setZoneEditorMode('create');
    setSelectedZone(null);
    setZoneEditorOpen(true);
  };

  const handleZoneSelect = (zone: GeofenceZone | null) => {
    if (!zone) {
      setSelectedZone(null);
      return;
    }
    setSelectedZone(zone);
    setDraftZone({
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusM: zone.radiusM,
    });
    setFormName(zone.name);
    setFormCategory(zone.category || 'custom');
    setFormEmoji(zone.emoji || '📍');
    setFormRadius(zone.radiusM);
    setFormWeatherAlerts(zone.weatherAlertsEnabled ?? true);
    setFormScheduleEnabled(Boolean(zone.scheduleEnabled));
    setFormScheduleStart(zone.scheduleStart || '08:00');
    setFormScheduleEnd(zone.scheduleEnd || '17:00');
    setFormScheduleDays(zone.scheduleDays && zone.scheduleDays.length > 0 ? zone.scheduleDays : [1, 2, 3, 4, 5]);
    setZoneEditorMode('edit');
    setZoneEditorOpen(true);
  };

  const cancelZoneEditor = () => {
    setZoneEditorOpen(false);
    setDraftZone(null);
    setSelectedZone(null);
    setIsPlacingZone(false);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftZone) return;
    setIsSubmittingZone(true);

    try {
      const payload = {
        name: formName.trim() || 'Safe Landing',
        category: formCategory,
        emoji: formEmoji,
        latitude: draftZone.latitude,
        longitude: draftZone.longitude,
        radius_m: formRadius,
        weather_alerts_enabled: formWeatherAlerts,
        schedule_enabled: isCaptain ? formScheduleEnabled : false,
        schedule_start: isCaptain && formScheduleEnabled ? formScheduleStart : '08:00',
        schedule_end: isCaptain && formScheduleEnabled ? formScheduleEnd : '17:00',
        schedule_days: isCaptain && formScheduleEnabled ? formScheduleDays : [1, 2, 3, 4, 5],
        privacy_schedule_from: isCaptain && formScheduleEnabled ? formScheduleStart : null,
        privacy_schedule_to: isCaptain && formScheduleEnabled ? formScheduleEnd : null,
        privacy_behavior: isCaptain && formScheduleEnabled ? 'pause' : 'none',
      };

      if (zoneEditorMode === 'create') {
        const { data: profile } = await supabase.rpc('get_web_account_profile').single<AccountProfile>();
        const userId = profile?.profile?.user_id;
        if (!userId) throw new Error('User account profile not found');

        const { error } = await supabase.from('saved_places').insert({
          ...payload,
          user_id: userId,
        });
        if (error) throw error;
        showSuccess('Safe Landing created successfully');
      } else {
        if (!selectedZone) return;
        const { error } = await supabase.from('saved_places').update({
          ...payload,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedZone.id);
        if (error) throw error;
        showSuccess('Safe Landing updated successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['savedPlaces', crewId] });
      cancelZoneEditor();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to save Safe Landing');
    } finally {
      setIsSubmittingZone(false);
    }
  };

  const handleDeleteZone = async () => {
    if (!selectedZone) return;
    if (!window.confirm(`Move "${selectedZone.name}" to Recycle Bin? It will be retained for 7 days before permanent purge.`)) return;

    setIsSubmittingZone(true);
    try {
      const { error } = await supabase.from('saved_places').update({
        deleted_at: new Date().toISOString(),
      }).eq('id', selectedZone.id);
      if (error) throw error;
      showSuccess(`"${selectedZone.name}" moved to Recycle Bin (7-day retention)`);
      await queryClient.invalidateQueries({ queryKey: ['savedPlaces', crewId] });
      await queryClient.invalidateQueries({ queryKey: ['savedPlacesRecycleBin', crewId] });
      cancelZoneEditor();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to delete Safe Landing');
    } finally {
      setIsSubmittingZone(false);
    }
  };

  const handleRestoreZone = async (placeId: string, name: string) => {
    try {
      const { error } = await supabase.from('saved_places').update({
        deleted_at: null,
      }).eq('id', placeId);
      if (error) throw error;
      showSuccess(`"${name}" restored to Safe Landings`);
      await queryClient.invalidateQueries({ queryKey: ['savedPlaces', crewId] });
      await queryClient.invalidateQueries({ queryKey: ['savedPlacesRecycleBin', crewId] });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to restore Safe Landing');
    }
  };

  const handlePermanentDelete = async (placeId: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('saved_places').delete().eq('id', placeId);
      if (error) throw error;
      showSuccess(`"${name}" permanently deleted`);
      await queryClient.invalidateQueries({ queryKey: ['savedPlacesRecycleBin', crewId] });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to permanently delete');
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (recycleBinItems.length === 0) return;
    if (!window.confirm(`Permanently remove all ${recycleBinItems.length} items from the Recycle Bin? This action cannot be undone.`)) return;
    try {
      const ids = recycleBinItems.map((i) => i.id);
      const { error } = await supabase.from('saved_places').delete().in('id', ids);
      if (error) throw error;
      showSuccess('Recycle Bin emptied');
      await queryClient.invalidateQueries({ queryKey: ['savedPlacesRecycleBin', crewId] });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to empty Recycle Bin');
    }
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <header className="flex flex-wrap items-center gap-2.5 pb-2">
        <h1 className="text-2xl font-bold text-on-surface">{t('webMapTitle')}</h1>
        <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-on-primary-container">
          {t('webMapMembersTracked', { count: positions.length })}
        </span>

        {/* Safe Landings toggle, add button & recycle bin button */}
        <div className="inline-flex items-center rounded-full border border-outline bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setShowZones((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              showZones
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            title={zones.length === 0 ? 'No Safe Landings configured' : `${zones.length} Safe Landings`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Safe Landings ({zones.length})</span>
          </button>
          <button
            type="button"
            onClick={startPlacingZone}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
              isPlacingZone
                ? 'bg-primary text-on-primary'
                : 'text-primary hover:bg-primary/10'
            }`}
            title="Create a new Safe Landing geofence on the map"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isPlacingZone ? 'Placing...' : 'Add'}</span>
          </button>
          <button
            type="button"
            onClick={() => setRecycleBinOpen(true)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
              recycleBinItems.length > 0
                ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            title="View deleted Safe Landings (7-day retention)"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Bin ({recycleBinItems.length})</span>
          </button>
        </div>

        {/* Weather radar toggle */}
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

        {/* Satellite Cloud Cover toggle */}
        <button
          type="button"
          onClick={() => setShowSatellite((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            showSatellite
              ? 'border-indigo-500/30 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-outline text-on-surface-variant hover:bg-surface-container'
          }`}
          title="Live Infrared Satellite Cloud Cover (First Mate+)"
        >
          <Cloud className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Satellite Clouds</span>
        </button>

        {/* Severe Weather Hazards toggle (NWS NOAA — US Only) */}
        {isUS && (
          <button
            type="button"
            onClick={() => setShowHazards((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              showHazards
                ? 'border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-outline text-on-surface-variant hover:bg-surface-container'
            }`}
            title="Active National Weather Service severe weather polygon warnings (US Only)"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Severe Hazards</span>
            {hazardCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {hazardCount}
              </span>
            )}
          </button>
        )}

        {/* Zero-Knowledge Telemetry Status & Unlock */}
        <button
          type="button"
          onClick={() => setZkModalOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            hasCrewKey
              ? 'border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
              : 'border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
          title="Zero-Knowledge Client Decryption Status"
        >
          {hasCrewKey ? (
            <Unlock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          )}
          <span>{hasCrewKey ? 'Zero-Knowledge Active' : 'Unlock E2EE Telemetry'}</span>
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
            onSelect={(pos) => {
              setSelected(pos);
              if (pos) {
                setSelectedHazard(null);
                setSelectedZone(null);
              }
            }}
            onError={(err) => setMapLoadError(err.message)}
            zones={zones}
            showZones={showZones}
            showRadar={showRadar}
            showSatellite={showSatellite}
            showHazards={isUS && showHazards}
            onHazardCountChange={setHazardCount}
            onHazardSelect={(h) => {
              setSelectedHazard(h);
              if (h) {
                setSelected(null);
                setSelectedZone(null);
              }
            }}
            isPlacingZone={isPlacingZone}
            draftZone={draftZone}
            onMapClick={handleMapClick}
            onZoneSelect={handleZoneSelect}
            onDraftMove={(lat, lng) => {
              setDraftZone((prev) => prev ? { ...prev, latitude: lat, longitude: lng } : null);
            }}
          />

          {/* Placing zone banner */}
          {isPlacingZone && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 rounded-full border border-primary/40 bg-surface/95 px-4 py-2 shadow-md backdrop-blur-md animate-fade-in">
              <MapPin className="h-4 w-4 text-primary animate-bounce" />
              <span className="text-xs font-medium text-on-surface">Click anywhere on the map to set the Safe Landing location</span>
              <button
                type="button"
                onClick={() => setIsPlacingZone(false)}
                className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-variant"
              >
                Cancel
              </button>
            </div>
          )}

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

        {/* Selected Member info card */}
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
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface">
                <span>{getMovementMode(selected.speed_ms, selected.event_type).emoji}</span>
                <span>{getMovementMode(selected.speed_ms, selected.event_type).label}</span>
              </span>
              {selected.speed_ms != null && selected.speed_ms > 0 && (
                <span className="rounded-md bg-primary-container px-2 py-0.5 text-xs font-semibold text-on-primary-container">
                  {formatSpeedMps(selected.speed_ms, system)}
                </span>
              )}
              {(() => {
                const mesh = extractMeshAttribution(selected);
                return mesh.isMeshRelayed ? (
                  <MeshRelayBadge hopCount={mesh.hopCount} relayedBy={mesh.relayedBy} />
                ) : null;
              })()}
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

        {/* Selected NWS Severe Weather Warning Card */}
        {selectedHazard && (
          <aside className="absolute top-3 right-3 z-[1100] max-w-sm rounded-xl border border-amber-500/40 bg-surface/95 p-4 shadow-lg backdrop-blur-md animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedHazard.color }}
                />
                <h3 className="text-sm font-bold text-on-surface">{selectedHazard.event}</h3>
              </div>
              <button
                onClick={() => setSelectedHazard(null)}
                className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Severity: {selectedHazard.severity}
              {selectedHazard.expires && ` · Expires ${new Date(selectedHazard.expires).toLocaleTimeString()}`}
            </div>
            <p className="mt-1.5 text-xs text-on-surface font-semibold">{selectedHazard.headline}</p>
            {selectedHazard.instruction && (
              <div className="mt-2 rounded-lg bg-surface-container p-2 text-[11px] text-on-surface-variant max-h-36 overflow-y-auto">
                <p className="font-semibold text-on-surface">Recommended Action:</p>
                <p className="mt-0.5 leading-relaxed">{selectedHazard.instruction}</p>
              </div>
            )}
          </aside>
        )}

        {/* Safe Landing Editor Drawer */}
        {zoneEditorOpen && draftZone && (
          <aside className="absolute bottom-3 right-3 z-[1100] w-80 rounded-xl border border-outline bg-surface p-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-outline/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-on-surface">
                  {zoneEditorMode === 'create' ? 'New Safe Landing' : 'Edit Safe Landing'}
                </h3>
              </div>
              <button
                onClick={cancelZoneEditor}
                className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-on-surface block mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Home Base, Marina Dock, School"
                  required
                  className="w-full rounded-lg border border-outline bg-surface-container px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-on-surface block mb-1">Emoji & Category</label>
                <div className="flex gap-1 overflow-x-auto py-1">
                  {['🏠', '🏢', '⚓', '🏕️', '🏫', '🏥', '🏪', '📍'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setFormEmoji(em)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm transition-transform ${
                        formEmoji === em ? 'border-primary bg-primary/20 scale-110' : 'border-outline/40 hover:bg-surface-container'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-on-surface mb-1">
                  <span>Radius</span>
                  <span className="text-primary font-mono">{formRadius} m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={formRadius}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setFormRadius(r);
                    setDraftZone((prev) => prev ? { ...prev, radiusM: r } : null);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>50m (Home)</span>
                  <span>500m (Campus)</span>
                  <span>1000m (Bay)</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formWeatherAlerts}
                  onChange={(e) => setFormWeatherAlerts(e.target.checked)}
                  className="rounded border-outline accent-primary h-3.5 w-3.5"
                />
                <span className="text-on-surface text-[11px]">Monitor for Severe Weather Warnings</span>
              </label>

              {/* Zone Operating Hours Schedule (Captain+) */}
              <div className="pt-2 border-t border-outline/40">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-on-surface text-xs">Operating Hours Schedule</span>
                  </div>
                  {isCaptain ? (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formScheduleEnabled}
                        onChange={(e) => setFormScheduleEnabled(e.target.checked)}
                        className="rounded border-outline accent-primary h-3.5 w-3.5"
                      />
                      <span className="text-[11px] text-on-surface-variant">Enforce schedule</span>
                    </label>
                  ) : (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      Captain Tier
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant mb-2">
                  Only monitor or enforce privacy rules during set days and hours.
                </p>

                {isCaptain ? (
                  formScheduleEnabled && (
                    <div className="space-y-2.5 rounded-lg bg-surface-container/60 p-2.5 border border-outline/30 animate-fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={formScheduleStart}
                            onChange={(e) => setFormScheduleStart(e.target.value)}
                            className="w-full rounded border border-outline bg-surface px-2 py-1 text-xs text-on-surface focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={formScheduleEnd}
                            onChange={(e) => setFormScheduleEnd(e.target.value)}
                            className="w-full rounded border border-outline bg-surface px-2 py-1 text-xs text-on-surface focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-on-surface-variant mb-1">
                          Active Days
                        </label>
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map(({ day, label, full }) => {
                            const active = formScheduleDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  setFormScheduleDays((prev) =>
                                    prev.includes(day)
                                      ? prev.filter((d) => d !== day)
                                      : [...prev, day].sort()
                                  );
                                }}
                                title={full}
                                className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold transition-colors ${
                                  active
                                    ? 'bg-primary text-on-primary'
                                    : 'border border-outline/40 text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                    Zone schedule windows require a <strong>Captain</strong> tier subscription.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-outline/40">
                {zoneEditorMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDeleteZone}
                    disabled={isSubmittingZone}
                    className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1.5 text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelZoneEditor}
                    disabled={isSubmittingZone}
                    className="rounded-lg border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingZone}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSubmittingZone ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>{zoneEditorMode === 'create' ? 'Save Landing' : 'Update'}</span>
                  </button>
                </div>
              </div>
            </form>
          </aside>
        )}

        {/* Safe Landings Recycle Bin Modal */}
        {recycleBinOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-outline bg-surface p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-outline/40">
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-on-surface">Safe Landings Recycle Bin</h3>
                    <p className="text-xs text-on-surface-variant">
                      Deleted zones are retained for 7 days before permanent purge.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecycleBinOpen(false)}
                  className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {recycleBinItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  <Archive className="mx-auto h-8 w-8 opacity-40 mb-2" />
                  No items in recycle bin.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recycleBinItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-outline/50 bg-surface-container/40 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.emoji || '📍'}</span>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            Deleted {new Date(item.deleted_at).toLocaleDateString()} ·{' '}
                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                              {getRetentionRemaining(item.deleted_at)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreZone(item.id, item.name)}
                          className="flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          title="Restore to Safe Landings"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(item.id, item.name)}
                          className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-outline/40">
                {recycleBinItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyRecycleBin}
                    className="flex items-center gap-1 text-xs font-semibold text-error hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Empty Bin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRecycleBinOpen(false)}
                  className="ml-auto rounded-lg bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ZeroKnowledgeUnlockModal
        isOpen={zkModalOpen}
        onClose={() => setZkModalOpen(false)}
      />
    </div>
  );
}
