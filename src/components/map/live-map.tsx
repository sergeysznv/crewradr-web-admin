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
  if (age <= IDLE_AFTER_MS) return '#34D399'; // active — green
  if (age <= STALE_AFTER_MS) return '#F59E0B'; // idle — amber
  return '#EF4444'; // stale — red
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
    circle.style.boxShadow = `0 0 0 4px ${color}, 0 2px 8px rgba(0,0,0,0.3)`;
  } else {
    circle.style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
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
  pill.style.background = 'rgba(0,0,0,0.78)';
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

interface LiveMapProps {
  positions: LivePosition[];
  selectedUserId: string | null;
  onSelect: (p: LivePosition | null) => void;
  onError?: (error: Error) => void;
}

export default function LiveMap({ positions, selectedUserId, onSelect, onError }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
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
      const color = pos.created_at ? markerColor(now, pos.created_at) : '#6B7280';
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

      map.addListener('click', () => onSelect(null));
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
    map.addListener('click', () => onSelect(null));
  }, [onSelect]);

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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
