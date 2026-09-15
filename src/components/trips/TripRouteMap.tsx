'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, Clock } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface TripRouteMapProps {
  polyline: [number, number][];
  stops?: { lat: number; lng: number; durationMin: number; timestamp: string }[];
  alerts?: { type: string; timestamp: string; description: string }[];
  isLive?: boolean;
}

export function TripRouteMap({
  polyline,
  stops = [],
  alerts = [],
  isLive = false,
}: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !GOOGLE_MAPS_API_KEY) return;
    if (polyline.length < 2) return;

    let cancelled = false;

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'quarterly',
    });

    loader
      .load()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        // Clear any previous map/markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }

        const path = polyline.map(([lat, lng]) => ({ lat, lng }));
        const startPoint = path[0];
        const endPoint = path[path.length - 1];

        const map =
          mapRef.current ??
          new google.maps.Map(containerRef.current, {
            center: startPoint,
            zoom: 13,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'cooperative',
          });
        mapRef.current = map;

        // Draw polyline
        const routeLine = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#0284c7', // primary sky blue
          strokeOpacity: 0.9,
          strokeWeight: 4.5,
          map,
        });
        polylineRef.current = routeLine;

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });

        // Start Marker
        const startMarker = new google.maps.Marker({
          position: startPoint,
          map,
          title: 'Trip Start',
          label: {
            text: 'S',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981', // green
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(startMarker);

        // End Marker
        const endMarker = new google.maps.Marker({
          position: endPoint,
          map,
          title: isLive ? 'Current Position (Live)' : 'Trip End',
          label: {
            text: isLive ? '●' : 'E',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: isLive ? '14px' : '11px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: isLive ? '#3b82f6' : '#ef4444', // blue or red
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(endMarker);

        // Stop Markers
        stops.forEach((st, idx) => {
          if (st.lat == null || st.lng == null) return;
          const stopMarker = new google.maps.Marker({
            position: { lat: st.lat, lng: st.lng },
            map,
            title: `Stop ${idx + 1}: ${st.durationMin} min`,
            label: {
              text: `${st.durationMin}m`,
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: 'bold',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#f59e0b', // amber
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
            },
          });
          markersRef.current.push(stopMarker);
        });
      })
      .catch(() => {
        setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [polyline, stops, isLive]);

  if (polyline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline bg-surface-variant/30 p-8 text-center">
        <Navigation className="h-8 w-8 text-on-surface-variant/50" />
        <p className="mt-2 text-sm font-medium text-on-surface">No GPS breadcrumb points</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Trip metadata was logged without active GPS coordinates.
        </p>
      </div>
    );
  }

  // If Maps API key is not configured or failed to load, display high-polish coordinate summary
  if (!GOOGLE_MAPS_API_KEY || loadError) {
    const start = polyline[0];
    const end = polyline[polyline.length - 1];

    return (
      <div className="rounded-xl border border-outline bg-surface p-4">
        <div className="flex items-center justify-between gap-2 border-b border-outline/50 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-on-surface">GPS Route Overview</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {polyline.length} Waypoints
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-surface-container p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
              S
            </span>
            <div className="truncate">
              <span className="font-semibold text-on-surface">Start:</span>{' '}
              <span className="text-on-surface-variant font-mono">
                {start[0].toFixed(4)}, {start[1].toFixed(4)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface-container p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
              {isLive ? '●' : 'E'}
            </span>
            <div className="truncate">
              <span className="font-semibold text-on-surface">{isLive ? 'Live Position:' : 'End:'}</span>{' '}
              <span className="text-on-surface-variant font-mono">
                {end[0].toFixed(4)}, {end[1].toFixed(4)}
              </span>
            </div>
          </div>
        </div>
        {stops.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
            <Clock className="h-3.5 w-3.5 text-warning" />
            <span>{stops.length} stop(s) recorded along route</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-outline bg-surface">
      <div ref={containerRef} className="h-64 w-full sm:h-72" />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-surface/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-on-surface shadow-sm border border-outline/40">
        <Navigation className="h-3 w-3 text-primary" />
        <span>{polyline.length} GPS Points</span>
      </div>
      {isLive && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg bg-success-container/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-on-success-container shadow-sm border border-success/30">
          <span className="h-2 w-2 rounded-full bg-success animate-ping" />
          <span>Tracking Live</span>
        </div>
      )}
    </div>
  );
}
