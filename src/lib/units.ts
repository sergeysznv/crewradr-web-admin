export type MeasurementSystem = 'metric' | 'imperial';

const IMPERIAL_COUNTRIES = new Set(['US', 'LR', 'MM', 'GB']);

/**
 * Derive the measurement system from a BCP 47 locale string (e.g. 'en-US' → 'imperial').
 * Falls back to 'metric' for unknown or missing country codes.
 */
export function deriveSystemFromLocale(locale: string): MeasurementSystem {
  const parts = locale.split('-');
  const countryCode = (parts[1] ?? '').toUpperCase();
  return IMPERIAL_COUNTRIES.has(countryCode) ? 'imperial' : 'metric';
}

/**
 * Format a speed in meters/second for display.
 */
export function formatSpeedMps(mps: number, system: MeasurementSystem): string {
  if (!isFinite(mps)) return '--';
  if (system === 'imperial') {
    const mph = mps * 2.236936;
    return `${mph.toFixed(0)} mph`;
  }
  const kmh = mps * 3.6;
  return `${kmh.toFixed(0)} km/h`;
}

/**
 * Format a distance in meters for display.
 */
export function formatDistanceMeters(meters: number, system: MeasurementSystem): string {
  if (!isFinite(meters)) return '--';
  if (meters < 0) meters = 0;
  if (system === 'imperial') {
    if (meters < 804.672) {
      // < 0.5 mile → display in feet
      return `${Math.round(meters * 3.28084)} ft`;
    }
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
  }
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

/**
 * Format a Celsius temperature for display.
 */
export function formatTemperatureCelsius(celsius: number, system: MeasurementSystem): string {
  if (!isFinite(celsius)) return '--';
  if (system === 'imperial') {
    return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}
