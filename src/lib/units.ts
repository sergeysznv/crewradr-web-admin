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

/**
 * Returns the speed unit string ('mph' or 'km/h').
 */
export function speedUnit(system: MeasurementSystem): string {
  return system === 'imperial' ? 'mph' : 'km/h';
}

/**
 * Returns the distance unit string ('mi' or 'km').
 */
export function distanceUnit(system: MeasurementSystem): string {
  return system === 'imperial' ? 'mi' : 'km';
}

/**
 * Converts a speed in mph to display speed in current unit system.
 */
export function mphToDisplaySpeed(mph: number, system: MeasurementSystem): number {
  if (!isFinite(mph)) return 0;
  return system === 'imperial' ? Math.round(mph) : Math.round(mph * 1.609344);
}

/**
 * Converts a display speed back to mph for storage.
 */
export function displaySpeedToMph(displaySpeed: number, system: MeasurementSystem): number {
  if (!isFinite(displaySpeed)) return 0;
  return system === 'imperial' ? Math.round(displaySpeed) : Math.round(displaySpeed / 1.609344);
}

/**
 * Formats a speed given in mph to a localized display string with unit.
 */
export function formatSpeedMph(mph: number, system: MeasurementSystem): string {
  if (!isFinite(mph)) return '--';
  const val = mphToDisplaySpeed(mph, system);
  const unit = speedUnit(system);
  return `${val} ${unit}`;
}

export const formatSpeedFromMph = formatSpeedMph;

/**
 * Format carbon emissions given in kilograms of CO2 for display.
 */
export function formatCarbonKg(kg: number, system: MeasurementSystem): string {
  if (!isFinite(kg) || isNaN(kg)) return '--';
  if (system === 'imperial') {
    return `${(kg * 2.20462).toFixed(1)} lbs CO₂`;
  }
  return `${kg.toFixed(1)} kg CO₂`;
}

/**
 * Format fuel volume given in gallons for display.
 */
export function formatFuelVolumeGallons(gallons: number, system: MeasurementSystem): string {
  if (!isFinite(gallons) || isNaN(gallons)) return '--';
  if (system === 'imperial') {
    return `${gallons.toFixed(1)} gal`;
  }
  return `${(gallons * 3.78541).toFixed(1)} L`;
}

