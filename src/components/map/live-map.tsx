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

const escapeHTML = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Build inner HTML for an AdvancedMarkerElement's content node.
function buildMarkerHTML(
  color: string,
  selected: boolean,
  stale: boolean,
  labelText: string,
): string {
  const safeLabel = escapeHTML(labelText);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="18" r="15" fill="${color}" stroke="#fff" stroke-width="2.5"
        opacity="${stale ? 0.45 : 1}" />
      ${selected ? `<circle cx="20" cy="18" r="19" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="5 3" opacity="0.6"/>` : ''}
      <polygon points="18,33 22,33 20,27" fill="${color}" stroke="#fff" stroke-width="1.5"
        opacity="${stale ? 0.45 : 1}" />
    </svg>
    <span style="position:absolute;top:4px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;font-weight:700;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${safeLabel}</span>`;
}

function createMarkerContent(
  color: string,
  selected: boolean,
  stale: boolean,
  labelText: string,
): HTMLElement {
  const div = document.createElement('div');
  div.style.position = 'relative';
  div.style.width = '40px';
  div.style.height = '40px';
  div.style.cursor = 'pointer';
  div.innerHTML = buildMarkerHTML(color, selected, stale, labelText);
  return div;
}

function updateMarkerContent(
  el: HTMLElement,
  color: string,
  selected: boolean,
  stale: boolean,
  labelText: string,
): void {
  el.innerHTML = buildMarkerHTML(color, selected, stale, labelText);
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

  // Declared before use so the purity lint sees a stable binding (runtime
  // behavior identical — function declarations are hoisted).
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

    // Fit bounds on first data
    if (!didFitRef.current && positions.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const pos of positions) {
        bounds.extend({ lat: pos.latitude, lng: pos.longitude });
      }
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      if (positions.length === 1) map.setZoom(14);
      didFitRef.current = true;
    }

    for (const pos of positions) {
      const isStale = now - new Date(pos.created_at).getTime() > STALE_AFTER_MS;
      const isSelected = pos.user_id === selectedUserId;
      const initial = pos.display_name?.charAt(0)?.toUpperCase() ?? '?';
      const labelText = pos.profile_emoji || initial;
      const color = markerColor(now, pos.created_at);

      const existing = markers.get(pos.user_id);
      if (existing) {
        existing.position = { lat: pos.latitude, lng: pos.longitude };
        existing.zIndex = isSelected ? 1000 : 1;
        existing.title = pos.display_name || initial;
        updateMarkerContent(existing.content as HTMLElement, color, isSelected, isStale, labelText);
      } else {
        const content = createMarkerContent(color, isSelected, isStale, labelText);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: pos.latitude, lng: pos.longitude },
          content,
          title: pos.display_name || initial,
          zIndex: isSelected ? 1000 : 1,
        });
        marker.addListener('gmp-click', () => onSelect(pos));
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
      version: 'weekly',
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
  }, [positions, selectedUserId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
