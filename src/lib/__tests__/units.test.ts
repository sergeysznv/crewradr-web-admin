import { describe, it, expect } from 'vitest';
import {
  deriveSystemFromLocale,
  formatSpeedMps,
  formatDistanceMeters,
  formatTemperatureCelsius,
} from '@/lib/units';

describe('deriveSystemFromLocale', () => {
  it('maps imperial countries to imperial', () => {
    expect(deriveSystemFromLocale('en-US')).toBe('imperial');
    expect(deriveSystemFromLocale('en-GB')).toBe('imperial');
  });

  it('falls back to metric for other locales', () => {
    expect(deriveSystemFromLocale('fr-FR')).toBe('metric');
    expect(deriveSystemFromLocale('de-DE')).toBe('metric');
    expect(deriveSystemFromLocale('ja-JP')).toBe('metric');
  });

  it('falls back to metric when no country code is present', () => {
    expect(deriveSystemFromLocale('en')).toBe('metric');
  });
});

describe('formatSpeedMps', () => {
  it('returns -- for non-finite values', () => {
    expect(formatSpeedMps(NaN, 'metric')).toBe('--');
    expect(formatSpeedMps(NaN, 'imperial')).toBe('--');
    expect(formatSpeedMps(Infinity, 'metric')).toBe('--');
    expect(formatSpeedMps(-Infinity, 'imperial')).toBe('--');
  });

  it('formats 0 m/s', () => {
    expect(formatSpeedMps(0, 'metric')).toBe('0 km/h');
    expect(formatSpeedMps(0, 'imperial')).toBe('0 mph');
  });

  it('formats 10 m/s in metric as km/h', () => {
    expect(formatSpeedMps(10, 'metric')).toBe('36 km/h');
  });

  it('formats 10 m/s in imperial as mph', () => {
    expect(formatSpeedMps(10, 'imperial')).toBe('22 mph');
  });

  it('rounds to the nearest whole number', () => {
    expect(formatSpeedMps(2.5, 'metric')).toBe('9 km/h');
    expect(formatSpeedMps(15, 'imperial')).toBe('34 mph');
  });
});

describe('formatDistanceMeters', () => {
  it('returns -- for non-finite values', () => {
    expect(formatDistanceMeters(NaN, 'metric')).toBe('--');
    expect(formatDistanceMeters(NaN, 'imperial')).toBe('--');
    expect(formatDistanceMeters(Infinity, 'imperial')).toBe('--');
    expect(formatDistanceMeters(-Infinity, 'metric')).toBe('--');
  });

  it('clamps negative values to zero', () => {
    expect(formatDistanceMeters(-5, 'metric')).toBe('0.0 m');
    expect(formatDistanceMeters(-5, 'imperial')).toBe('0 ft');
  });

  it('formats 0 meters', () => {
    expect(formatDistanceMeters(0, 'metric')).toBe('0.0 m');
    expect(formatDistanceMeters(0, 'imperial')).toBe('0 ft');
  });

  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistanceMeters(500, 'metric')).toBe('500.0 m');
    expect(formatDistanceMeters(999.9, 'metric')).toBe('999.9 m');
  });

  it('formats sub-half-mile distances in feet', () => {
    expect(formatDistanceMeters(200, 'imperial')).toBe('656 ft');
    expect(formatDistanceMeters(500, 'imperial')).toBe('1640 ft');
  });

  it('converts kilometers with one decimal below 10 km', () => {
    expect(formatDistanceMeters(1500, 'metric')).toBe('1.5 km');
    expect(formatDistanceMeters(1000, 'metric')).toBe('1.0 km');
  });

  it('converts miles with one decimal below 10 mi', () => {
    expect(formatDistanceMeters(1500, 'imperial')).toBe('0.9 mi');
    expect(formatDistanceMeters(900, 'imperial')).toBe('0.6 mi');
    expect(formatDistanceMeters(10000, 'imperial')).toBe('6.2 mi');
  });

  it('drops decimals at 10 km or more', () => {
    expect(formatDistanceMeters(10000, 'metric')).toBe('10 km');
    expect(formatDistanceMeters(20000, 'metric')).toBe('20 km');
  });

  it('drops decimals at 10 mi or more', () => {
    expect(formatDistanceMeters(20000, 'imperial')).toBe('12 mi');
  });
});

describe('formatTemperatureCelsius', () => {
  it('returns -- for non-finite values', () => {
    expect(formatTemperatureCelsius(NaN, 'metric')).toBe('--');
    expect(formatTemperatureCelsius(NaN, 'imperial')).toBe('--');
    expect(formatTemperatureCelsius(Infinity, 'metric')).toBe('--');
    expect(formatTemperatureCelsius(-Infinity, 'imperial')).toBe('--');
  });

  it('formats 0°C', () => {
    expect(formatTemperatureCelsius(0, 'metric')).toBe('0°C');
    expect(formatTemperatureCelsius(0, 'imperial')).toBe('32°F');
  });

  it('formats 100°C', () => {
    expect(formatTemperatureCelsius(100, 'metric')).toBe('100°C');
    expect(formatTemperatureCelsius(100, 'imperial')).toBe('212°F');
  });

  it('formats -40°C (the crossover point)', () => {
    expect(formatTemperatureCelsius(-40, 'metric')).toBe('-40°C');
    expect(formatTemperatureCelsius(-40, 'imperial')).toBe('-40°F');
  });

  it('rounds to the nearest whole degree', () => {
    expect(formatTemperatureCelsius(36.7, 'metric')).toBe('37°C');
    expect(formatTemperatureCelsius(36.7, 'imperial')).toBe('98°F');
  });
});
