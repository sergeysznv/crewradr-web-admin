// src/components/trips/TripTimeline.tsx
'use client';

import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { SpeedGraph } from './SpeedGraph';
import { formatSpeedMps } from '@/lib/units';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import type { TripDetail } from '@/types/tier';

export function TripTimeline({ trip }: { trip: TripDetail }) {
  const { t } = useT();
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const { system } = useMeasurementSystem();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-on-surface">
          {t('webTripsMemberTripTitle', { name: trip.memberName || t('webTripsMember') })}
        </h2>
        {trip.isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-container px-2.5 py-0.5 text-xs font-bold text-on-success-container">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            {t('webTripsLive')}
          </span>
        )}
      </div>

      {/* Time range */}
      <p className="text-sm text-on-surface-variant">
        {new Date(trip.startTime).toLocaleString()} —{' '}
        {trip.endTime ? new Date(trip.endTime).toLocaleString() : t('webTripsInProgress')}
      </p>

      {/* Speed graph */}
      <div>
        <h3 className="mb-2 text-base font-semibold text-on-surface">{t('webTripsSpeed')}</h3>
        <SpeedGraph samples={trip.speedSamples} />
        {/* Fallback when no detailed speed samples exist but trip-level max/avg are available */}
        {trip.speedSamples.length === 0 && trip.maxSpeedMs > 0 && (
          <p className="mt-2 text-sm text-on-surface-variant">
            {t('webTripsMaxSpeed')}: {formatSpeedMps(trip.maxSpeedMs, system)}
            {trip.avgSpeedMs > 0 && ` · ${t('webTripsAvgSpeed')}: ${formatSpeedMps(trip.avgSpeedMs, system)}`}
          </p>
        )}
      </div>

      {/* Stops */}
      {trip.stops.length > 0 && (
        <div>
          <h3 className="mb-2 text-base font-semibold text-on-surface">{t('webTripsStops')}</h3>
          <div className="space-y-2">
            {trip.stops.map((stop, i) => (
              <button
                key={i}
                onClick={() => setSelectedStop(selectedStop === i ? null : i)}
                className={`w-full rounded-xl border p-sz-lg text-left transition-colors ${
                  selectedStop === i
                    ? 'border-primary bg-primary-container'
                    : 'border-outline bg-surface hover:border-outline-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-on-surface">
                    {t('webTripsStopAt', { lat: stop.lat.toFixed(4), lng: stop.lng.toFixed(4) })}
                  </span>
                  <span className="shrink-0 text-xs text-on-surface-variant">
                    {t('webTripsDurationMin', { n: stop.durationMin })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {new Date(stop.timestamp).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alerts during trip */}
      {trip.alerts.length > 0 && (
        <div>
          <h3 className="mb-2 text-base font-semibold text-on-surface">{t('webTripsAlerts')}</h3>
          <div className="space-y-2">
            {trip.alerts.map((alert, i) => (
              <div key={i} className="rounded-xl border border-error/20 bg-error-container p-sz-lg">
                <span className="text-sm font-semibold text-error">{alert.type}</span>
                <p className="mt-0.5 text-sm text-on-surface-variant">{alert.description}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
