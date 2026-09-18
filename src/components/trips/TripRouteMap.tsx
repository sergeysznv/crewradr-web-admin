'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import {
  MapPin,
  Navigation,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  FastForward,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface TripRouteMapProps {
  polyline: [number, number][];
  stops?: { lat: number; lng: number; durationMin: number; timestamp: string }[];
  alerts?: { type: string; timestamp: string; description: string }[];
  isLive?: boolean;
  speedSamples?: { timestamp: string; speedMph: number }[];
  maxSpeedMs?: number;
  avgSpeedMs?: number;
}

function getSpeedColor(speedMph: number): string {
  if (speedMph > 65) return '#ef4444'; // Red (High speed / speeding)
  if (speedMph > 45) return '#f59e0b'; // Amber (Cruising / moderate speed)
  return '#10b981'; // Green (Safe / low speed)
}

export function TripRouteMap({
  polyline,
  stops = [],
  alerts = [],
  isLive = false,
  speedSamples = [],
  maxSpeedMs = 0,
  avgSpeedMs = 0,
}: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const scrubMarkerRef = useRef<google.maps.Marker | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Playback & Scrubber state
  const [scrubIndex, setScrubIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 5>(1);

  // Resolve speed at current scrub index
  const currentSpeedMph = (() => {
    if (speedSamples.length === 0 || polyline.length === 0) return 0;
    const sampleIdx = Math.min(
      speedSamples.length - 1,
      Math.floor((scrubIndex / Math.max(1, polyline.length - 1)) * speedSamples.length),
    );
    return Math.round(speedSamples[sampleIdx]?.speedMph ?? 0);
  })();

  // Current timestamp at scrub index
  const currentTimestamp = (() => {
    if (speedSamples.length === 0) return null;
    const sampleIdx = Math.min(
      speedSamples.length - 1,
      Math.floor((scrubIndex / Math.max(1, polyline.length - 1)) * speedSamples.length),
    );
    const ts = speedSamples[sampleIdx]?.timestamp;
    return ts ? new Date(ts).toLocaleTimeString() : null;
  })();

  // Initialize and draw route on Google Maps
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

        // Clear existing overlays
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];
        if (scrubMarkerRef.current) {
          scrubMarkerRef.current.setMap(null);
          scrubMarkerRef.current = null;
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

        // Draw multi-color speed polyline segments if speedSamples are present
        if (speedSamples.length > 0 && path.length > 1) {
          const sampleRatio = speedSamples.length / path.length;
          for (let i = 0; i < path.length - 1; i++) {
            const sampleIdx = Math.min(speedSamples.length - 1, Math.floor(i * sampleRatio));
            const speed = speedSamples[sampleIdx]?.speedMph ?? 0;
            const segmentColor = getSpeedColor(speed);

            const segment = new google.maps.Polyline({
              path: [path[i], path[i + 1]],
              geodesic: true,
              strokeColor: segmentColor,
              strokeOpacity: 0.95,
              strokeWeight: 5,
              map,
            });
            polylinesRef.current.push(segment);
          }
        } else {
          // Fallback single line
          const routeLine = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#0284c7',
            strokeOpacity: 0.9,
            strokeWeight: 4.5,
            map,
          });
          polylinesRef.current.push(routeLine);
        }

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { top: 36, right: 36, bottom: 36, left: 36 });

        // Start Marker (Green circle with 'S')
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
            fillColor: '#10b981',
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
            fillColor: isLive ? '#3b82f6' : '#ef4444',
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
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
            },
          });
          markersRef.current.push(stopMarker);
        });

        // Alert Markers
        alerts.forEach((alt, idx) => {
          // If we can locate the alert in the route
          const alertPoint = path[Math.min(path.length - 1, idx * 5 + 2)];
          if (!alertPoint) return;
          const alertMarker = new google.maps.Marker({
            position: alertPoint,
            map,
            title: `Alert: ${alt.type} - ${alt.description}`,
            label: {
              text: '⚠️',
              fontSize: '12px',
            },
          });
          markersRef.current.push(alertMarker);
        });

        // Vehicle Scrubber Replay Marker
        const initialPoint = path[0];
        const scrubMarker = new google.maps.Marker({
          position: initialPoint,
          map,
          title: 'Playback Position',
          zIndex: 999,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#0284c7',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: 0,
          },
        });
        scrubMarkerRef.current = scrubMarker;
      })
      .catch(() => {
        setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [polyline, stops, alerts, isLive, speedSamples]);

  // Sync scrubber marker position
  useEffect(() => {
    if (!scrubMarkerRef.current || polyline.length === 0) return;
    const pt = polyline[Math.min(polyline.length - 1, scrubIndex)];
    if (!pt) return;
    scrubMarkerRef.current.setPosition({ lat: pt[0], lng: pt[1] });
  }, [scrubIndex, polyline]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubIndex((curr) => {
        if (curr + playSpeed >= polyline.length - 1) {
          setIsPlaying(false);
          return polyline.length - 1;
        }
        return curr + playSpeed;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, polyline.length]);

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

  // Fallback if Maps API key is missing or load failed
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
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-outline bg-surface">
        <div ref={containerRef} className="h-64 w-full sm:h-80" />

        {/* Floating route metadata badges */}
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

        {/* Speed Color Legend */}
        {speedSamples.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg bg-surface/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant shadow-sm border border-outline/40">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              &lt; 45 mph
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              45–65 mph
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              &gt; 65 mph
            </span>
          </div>
        )}
      </div>

      {/* Interactive Trip Scrubber & Playback Controls */}
      <div className="rounded-xl border border-outline bg-surface p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause replay' : 'Play trip replay'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubIndex(0);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Reset to trip start"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPlaySpeed((s) => (s === 1 ? 2 : s === 2 ? 5 : 1));
              }}
              className="flex items-center gap-1 rounded-lg border border-outline px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              title="Cycle playback speed"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>{playSpeed}x</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {currentSpeedMph > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-container px-2 py-0.5 font-bold text-on-primary-container">
                <Gauge className="h-3 w-3" />
                {currentSpeedMph} mph
              </span>
            )}
            {currentTimestamp && (
              <span className="text-on-surface-variant font-mono">
                {currentTimestamp}
              </span>
            )}
            <span className="text-on-surface-variant font-mono text-[11px]">
              {scrubIndex + 1} / {polyline.length}
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="mt-2.5">
          <input
            type="range"
            min="0"
            max={Math.max(1, polyline.length - 1)}
            value={scrubIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setScrubIndex(Number(e.target.value));
            }}
            className="w-full accent-primary cursor-pointer h-1.5 bg-surface-container rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
