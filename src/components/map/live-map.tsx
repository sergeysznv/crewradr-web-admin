'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { LivePosition } from '@/types/rpc';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID';

const STALE_AFTER_MS = 15 * 60 * 1000;
const IDLE_AFTER_MS = 5 * 60 * 1000;

function markerColor(now: number, createdAt: string): string {
  const age = now - new Date(createdAt).getTime();
  if (age <= IDLE_AFTER_MS) return 'var(--color-success)'; // active — green
  if (age <= STALE_AFTER_MS) return 'var(--color-warning)'; // idle — amber
  return 'var(--color-error)'; // stale — red
}

function createMarkerContent(
  avatarUrl: string | null,
  color: string,
  selected: boolean,
  stale: boolean,
  labelText: string,
  displayName: string,
): HTMLElement {
  const size = selected ? 52 : 42;
  const opacity = stale ? '0.45' : '1';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.cursor = 'pointer';

  // Circle
  const circle = document.createElement('div');
  circle.style.width = `${size}px`;
  circle.style.height = `${size}px`;
  circle.style.borderRadius = '50%';
  circle.style.display = 'flex';
  circle.style.alignItems = 'center';
  circle.style.justifyContent = 'center';
  circle.style.overflow = 'hidden';
  circle.style.boxSizing = 'border-box';
  circle.style.border = '2.5px solid #fff';
  circle.style.opacity = opacity;

  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = displayName;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    img.referrerPolicy = 'no-referrer';
    circle.appendChild(img);
  } else {
    circle.style.background = color;
    const letter = document.createElement('span');
    letter.textContent = labelText;
    letter.style.color = '#fff';
    letter.style.fontSize = selected ? '20px' : '16px';
    letter.style.fontWeight = '700';
    letter.style.lineHeight = '1';
    circle.appendChild(letter);
  }

  if (selected) {
    // Flat selection ring: solid white border + status-color outline (no box-shadow on GPU-composited map markers)
    circle.style.border = '2.5px solid #fff';
    circle.style.outline = `2px solid ${color}`;
    circle.style.outlineOffset = '2px';
  }

  // Pointer triangle
  const pointer = document.createElement('div');
  pointer.style.width = '0';
  pointer.style.height = '0';
  pointer.style.borderLeft = '6px solid transparent';
  pointer.style.borderRight = '6px solid transparent';
  pointer.style.borderTop = `8px solid ${avatarUrl ? '#fff' : color}`;
  pointer.style.marginTop = '-1px';
  pointer.style.opacity = opacity;

  // Name pill
  const pill = document.createElement('span');
  pill.textContent = displayName;
  pill.style.background = '#000000';
  pill.style.color = '#fff';
  pill.style.fontSize = '11px';
  pill.style.fontWeight = '600';
  pill.style.padding = '2px 8px';
  pill.style.borderRadius = '10px';
  pill.style.whiteSpace = 'nowrap';
  pill.style.maxWidth = '140px';
  pill.style.overflow = 'hidden';
  pill.style.textOverflow = 'ellipsis';
  pill.style.marginTop = '2px';
  pill.style.pointerEvents = 'none';

  wrapper.appendChild(circle);
  wrapper.appendChild(pointer);
  wrapper.appendChild(pill);

  return wrapper;
}

function updateMarkerContent(
  el: HTMLElement,
  avatarUrl: string | null,
  color: string,
  selected: boolean,
  stale: boolean,
  labelText: string,
  displayName: string,
): void {
  const newEl = createMarkerContent(avatarUrl, color, selected, stale, labelText, displayName);
  el.replaceChildren(...Array.from(newEl.childNodes));
}

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  category?: string;
  emoji?: string;
  weatherAlertsEnabled?: boolean;
}

export interface NwsHazardAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string;
  expires: string;
  color: string;
}

export interface DraftZoneState {
  latitude: number;
  longitude: number;
  radiusM: number;
}

export interface LiveMapProps {
  positions: LivePosition[];
  selectedUserId: string | null;
  onSelect: (p: LivePosition | null) => void;
  onError?: (error: Error) => void;
  zones?: GeofenceZone[];
  showZones?: boolean;
  showRadar?: boolean;
  showHazards?: boolean;
  onHazardSelect?: (hazard: NwsHazardAlert | null) => void;
  onHazardCountChange?: (count: number) => void;
  isPlacingZone?: boolean;
  draftZone?: DraftZoneState | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onZoneSelect?: (zone: GeofenceZone | null) => void;
  onDraftMove?: (lat: number, lng: number) => void;
}

function getNwsColor(event: string): { stroke: string; fill: string } {
  const e = event.toLowerCase();
  if (e.includes('tornado')) {
    return { stroke: '#b91c1c', fill: '#ef4444' };
  }
  if (e.includes('thunderstorm') || e.includes('hail')) {
    return { stroke: '#d97706', fill: '#f59e0b' };
  }
  if (e.includes('flood')) {
    return { stroke: '#0891b2', fill: '#06b6d4' };
  }
  if (e.includes('marine') || e.includes('gale') || e.includes('wind')) {
    return { stroke: '#7e22ce', fill: '#a855f7' };
  }
  if (e.includes('winter') || e.includes('blizzard') || e.includes('snow') || e.includes('ice')) {
    return { stroke: '#2563eb', fill: '#3b82f6' };
  }
  if (e.includes('fire') || e.includes('red flag')) {
    return { stroke: '#ea580c', fill: '#f97316' };
  }
  return { stroke: '#dc2626', fill: '#ef4444' };
}

export default function LiveMap({
  positions,
  selectedUserId,
  onSelect,
  onError,
  zones = [],
  showZones = true,
  showRadar = false,
  showHazards = true,
  onHazardSelect,
  onHazardCountChange,
  isPlacingZone = false,
  draftZone = null,
  onMapClick,
  onZoneSelect,
  onDraftMove,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const radarLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const nwsDataRef = useRef<google.maps.Data | null>(null);
  const draftCircleRef = useRef<google.maps.Circle | null>(null);
  const draftMarkerRef = useRef<google.maps.Marker | null>(null);
  const isPlacingRef = useRef(isPlacingZone);
  isPlacingRef.current = isPlacingZone;

  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const circlesRef = useRef<Map<string, { circle: google.maps.Circle; marker?: google.maps.Marker }>>(new Map());
  const didFitRef = useRef(false);
  const pendingMarkersRef = useRef<LivePosition[]>([]);
  const loadErrorRef = useRef(false);
  // Stable ref for the currently selected user — keeps gmp-click handler
  // closures from re-registering on every render.
  const selectedRef = useRef<string | null>(selectedUserId);
  selectedRef.current = selectedUserId;

  function fitAllMarkers(map: google.maps.Map) {
    const markers = markersRef.current;
    if (markers.size === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const marker of markers.values()) {
      const pos = marker.position;
      if (pos) bounds.extend(pos);
    }
    if (markers.size === 1) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 160, left: 40 });
      map.setZoom(Math.min(map.getZoom() ?? 14, 14));
    } else {
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 160, left: 80 });
    }
  }

  function syncMarkers(map: google.maps.Map, positions: LivePosition[]) {
    const markers = markersRef.current;
    const currentIds = new Set(positions.map((p) => p.user_id));
    const now = Date.now();

    // Remove stale markers
    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.map = null;
        markers.delete(id);
      }
    }

    // Fit bounds on first data — fitAllMarkers handles null positions internally.
    if (!didFitRef.current && positions.some((p) => p.latitude != null && p.longitude != null)) {
      didFitRef.current = true;
      // Defer so the map has finished rendering its first frame.
      setTimeout(() => fitAllMarkers(map), 100);
    }

    for (const pos of positions) {
      // Members without a location fix (lat/lng null) cannot be placed on the
      // map — remove any existing marker and skip.
      if (pos.latitude == null || pos.longitude == null) {
        const old = markers.get(pos.user_id);
        if (old) {
          old.map = null;
          markers.delete(pos.user_id);
        }
        continue;
      }

      const isStale = pos.created_at
        ? now - new Date(pos.created_at).getTime() > STALE_AFTER_MS
        : true;
      const isSelected = pos.user_id === selectedUserId;
      const initial = pos.display_name?.charAt(0)?.toUpperCase() ?? '?';
      const labelText = pos.profile_emoji || initial;
      const color = pos.created_at ? markerColor(now, pos.created_at) : 'var(--color-on-surface-variant)';
      const displayName = pos.display_name || initial;

      const existing = markers.get(pos.user_id);
      if (existing) {
        existing.position = { lat: pos.latitude, lng: pos.longitude };
        existing.zIndex = isSelected ? 1000 : 1;
        updateMarkerContent(
          existing.content as HTMLElement,
          pos.avatar_url,
          color,
          isSelected,
          isStale,
          labelText,
          displayName,
        );
      } else {
        const content = createMarkerContent(pos.avatar_url, color, isSelected, isStale, labelText, displayName);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: pos.latitude, lng: pos.longitude },
          content,
          zIndex: isSelected ? 1000 : 1,
        });
        marker.addListener('gmp-click', () => {
          // Toggle: if already selected, deselect
          onSelect(selectedRef.current === pos.user_id ? null : pos);
        });
        markers.set(pos.user_id, marker);
      }
    }
  }

  function syncZones(map: google.maps.Map, zoneList: GeofenceZone[], show: boolean) {
    const existing = circlesRef.current;
    if (!show) {
      for (const item of existing.values()) {
        item.circle.setMap(null);
        item.marker?.setMap(null);
      }
      existing.clear();
      return;
    }

    const currentIds = new Set(zoneList.map((z) => z.id));
    for (const [id, item] of existing) {
      if (!currentIds.has(id)) {
        item.circle.setMap(null);
        item.marker?.setMap(null);
        existing.delete(id);
      }
    }

    for (const z of zoneList) {
      if (z.latitude == null || z.longitude == null) continue;
      if (existing.has(z.id)) continue;

      const circle = new google.maps.Circle({
        map,
        center: { lat: z.latitude, lng: z.longitude },
        radius: z.radiusM || 75,
        fillColor: '#10b981',
        fillOpacity: 0.12,
        strokeColor: '#059669',
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
      });

      const marker = new google.maps.Marker({
        map,
        position: { lat: z.latitude, lng: z.longitude },
        title: `${z.emoji ?? '📍'} ${z.name} (${z.radiusM}m)`,
        label: {
          text: `${z.emoji ?? '📍'} ${z.name}`,
          color: '#064e3b',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      const clickHandler = () => onZoneSelect?.(z);
      circle.addListener('click', clickHandler);
      marker.addListener('click', clickHandler);

      existing.set(z.id, { circle, marker });
    }
  }

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'quarterly',
      libraries: ['marker'],
    });

    loader.load().then(() => {
      if (cancelled || !containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 39.8, lng: -98.5 },
        zoom: 4,
        mapId: MAP_ID,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        scrollwheel: false,
        gestureHandling: 'greedy',
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (isPlacingRef.current && e.latLng) {
          onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        } else {
          onSelect(null);
          onHazardSelect?.(null);
          onZoneSelect?.(null);
        }
      });
      mapRef.current = map;

      if (pendingMarkersRef.current.length > 0) {
        syncMarkers(map, pendingMarkersRef.current);
        pendingMarkersRef.current = [];
      }
    }).catch((err: unknown) => {
      if (!loadErrorRef.current) {
        loadErrorRef.current = true;
        onError?.(err instanceof Error ? err : new Error('Google Maps failed to load'));
      }
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    google.maps.event.clearListeners(map, 'click');
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (isPlacingRef.current && e.latLng) {
        onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      } else {
        onSelect(null);
        onHazardSelect?.(null);
        onZoneSelect?.(null);
      }
    });
  }, [onSelect, onHazardSelect, onZoneSelect, onMapClick]);

  // Sync cursor in placing mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ draggableCursor: isPlacingZone ? 'crosshair' : null });
  }, [isPlacingZone]);

  // Sync draft zone pin & radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!draftZone) {
      if (draftCircleRef.current) {
        draftCircleRef.current.setMap(null);
        draftCircleRef.current = null;
      }
      if (draftMarkerRef.current) {
        draftMarkerRef.current.setMap(null);
        draftMarkerRef.current = null;
      }
      return;
    }

    const pos = { lat: draftZone.latitude, lng: draftZone.longitude };
    if (!draftCircleRef.current) {
      draftCircleRef.current = new google.maps.Circle({
        map,
        center: pos,
        radius: draftZone.radiusM,
        fillColor: '#3b82f6',
        fillOpacity: 0.22,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        zIndex: 20,
      });

      draftMarkerRef.current = new google.maps.Marker({
        map,
        position: pos,
        draggable: true,
        title: 'Drag to adjust Safe Landing center',
        zIndex: 25,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      draftMarkerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onDraftMove?.(e.latLng.lat(), e.latLng.lng());
        }
      });
    } else {
      draftCircleRef.current.setCenter(pos);
      draftCircleRef.current.setRadius(draftZone.radiusM);
      draftMarkerRef.current?.setPosition(pos);
    }
  }, [draftZone, onDraftMove]);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      pendingMarkersRef.current = positions;
      return;
    }
    syncMarkers(map, positions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, selectedUserId]);

  // Sync geofence zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncZones(map, zones, showZones);
  }, [zones, showZones]);

  // Zoom to all on deselect
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedUserId;
    // Zoom to all when transitioning from selected → null
    if (prev !== null && selectedUserId === null) {
      fitAllMarkers(map);
    }
  }, [selectedUserId]);

  // Sync weather radar layer (RainViewer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    if (!showRadar) {
      if (radarLayerRef.current) {
        const overlays = map.overlayMapTypes;
        for (let i = overlays.getLength() - 1; i >= 0; i--) {
          if (overlays.getAt(i) === radarLayerRef.current) {
            overlays.removeAt(i);
          }
        }
        radarLayerRef.current = null;
      }
      return;
    }

    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !mapRef.current) return;
        const past = data?.radar?.past;
        if (!past || past.length === 0) return;
        const latestFrame = past[past.length - 1];
        const path = latestFrame?.path;
        if (!path) return;

        if (radarLayerRef.current) {
          const overlays = map.overlayMapTypes;
          for (let i = overlays.getLength() - 1; i >= 0; i--) {
            if (overlays.getAt(i) === radarLayerRef.current) {
              overlays.removeAt(i);
            }
          }
        }

        const radarMapType = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) =>
            `https://tilecache.rainviewer.com${path}/256/${zoom}/${coord.x}/${coord.y}/2/1_1.png`,
          tileSize: new google.maps.Size(256, 256),
          opacity: 0.65,
          name: 'RainViewer',
        });

        radarLayerRef.current = radarMapType;
        map.overlayMapTypes.push(radarMapType);
      })
      .catch((err) => {
        console.warn('LiveMap: RainViewer fetch failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, [showRadar]);

  // Sync NWS Severe Weather Hazard Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!showHazards) {
      if (nwsDataRef.current) {
        nwsDataRef.current.setMap(null);
        nwsDataRef.current = null;
      }
      return;
    }

    let cancelled = false;

    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=Extreme,Severe', {
      headers: { 'User-Agent': 'CrewRadr/1.0 (support@crewradr.app)' },
    })
      .then((res) => res.json())
      .then((geojson) => {
        if (cancelled || !mapRef.current) return;

        if (nwsDataRef.current) {
          nwsDataRef.current.setMap(null);
          nwsDataRef.current = null;
        }

        const validFeatures = (geojson?.features || []).filter(
          (f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        );

        onHazardCountChange?.(validFeatures.length);

        if (validFeatures.length === 0) return;

        const dataLayer = new google.maps.Data();
        dataLayer.addGeoJson({
          type: 'FeatureCollection',
          features: validFeatures,
        });

        dataLayer.setStyle((feature) => {
          const event = String(feature.getProperty('event') || '');
          const colors = getNwsColor(event);
          return {
            fillColor: colors.fill,
            fillOpacity: 0.22,
            strokeColor: colors.stroke,
            strokeWeight: 2,
            strokeOpacity: 0.85,
            zIndex: 10,
          };
        });

        dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
          const feature = event.feature;
          const eventName = String(feature.getProperty('event') || 'Weather Warning');
          const colors = getNwsColor(eventName);
          const hazard: NwsHazardAlert = {
            id: String(feature.getId() || feature.getProperty('id') || Math.random().toString()),
            event: eventName,
            severity: String(feature.getProperty('severity') || 'Severe'),
            headline: String(feature.getProperty('headline') || eventName),
            description: String(feature.getProperty('description') || ''),
            instruction: String(feature.getProperty('instruction') || ''),
            expires: String(feature.getProperty('expires') || ''),
            color: colors.fill,
          };
          onHazardSelect?.(hazard);
        });

        dataLayer.setMap(map);
        nwsDataRef.current = dataLayer;
      })
      .catch((err) => {
        console.warn('LiveMap: NWS alerts fetch failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, [showHazards, onHazardCountChange, onHazardSelect]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {showRadar && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[1100] flex flex-col gap-1.5 rounded-xl border border-outline/50 bg-surface/90 p-2.5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span>Precipitation Radar</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <div className="h-2 w-48 rounded-full bg-gradient-to-r from-[#00E676] via-[#FFEA00] via-[#FF9100] via-[#FF1744] to-[#D500F9]" />
          <div className="flex justify-between text-[9px] font-semibold text-on-surface-variant">
            <span>Light</span>
            <span>Moderate</span>
            <span>Heavy</span>
            <span>Hail</span>
          </div>
        </div>
      )}
    </div>
  );
}
