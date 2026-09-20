// src/lib/__tests__/crashBlackbox.test.ts
import { describe, it, expect } from 'vitest';
import { reconstructCrashIncident, generateCertifiedReportHtml } from '../crashBlackbox';
import type { TripDetail } from '@/types/tier';

const mockTrip: TripDetail = {
  tripId: 'trip-123',
  memberId: 'mem-456',
  memberName: 'Captain Marvel',
  startTime: '2026-03-20T10:00:00Z',
  endTime: '2026-03-20T10:30:00Z',
  isLive: false,
  polyline: [[37.7749, -122.4194]],
  speedSamples: [{ timestamp: '2026-03-20T10:29:50Z', speedMph: 48 }],
  maxSpeedMs: 25,
  avgSpeedMs: 15,
  stops: [],
  alerts: [{ type: 'crash_detected', timestamp: '2026-03-20T10:30:00Z', description: 'Severe deceleration detected' }],
};

describe('crashBlackbox', () => {
  it('reconstructs a valid 30-second forensic buffer', () => {
    const incident = reconstructCrashIncident(mockTrip, '2026-03-20T10:30:00Z');

    expect(incident.incidentId).toMatch(/^INC-\d+/);
    expect(incident.tripId).toBe('trip-123');
    expect(incident.memberName).toBe('Captain Marvel');
    expect(incident.telemetryTrace.length).toBe(31); // -30s to 0s inclusive
    expect(incident.peakGForce).toBeGreaterThan(10);
    expect(incident.cryptographicHash).toBeDefined();
    expect(incident.cryptographicHash.length).toBe(64);

    const impactPoint = incident.telemetryTrace[incident.telemetryTrace.length - 1];
    expect(impactPoint.timeOffsetSec).toBe(0);
    expect(impactPoint.speedMph).toBe(0);
    expect(impactPoint.totalGForce).toBeGreaterThan(10);
  });

  it('generates a certified HTML report containing essential forensic evidence', () => {
    const incident = reconstructCrashIncident(mockTrip, '2026-03-20T10:30:00Z');
    const html = generateCertifiedReportHtml(incident, 'imperial');

    expect(html).toContain('CREWRADR FORENSIC BLACKBOX CRASH REPORT');
    expect(html).toContain(incident.incidentId);
    expect(html).toContain('Captain Marvel');
    expect(html).toContain('VERIFIED LOCKED / NO DISTRACTION');
    expect(html).toContain('SHA256:');
    expect(html).toContain('Legal Disclaimer:');
  });

  it('formats metric speeds correctly in HTML report', () => {
    const incident = reconstructCrashIncident(mockTrip, '2026-03-20T10:30:00Z');
    const htmlMetric = generateCertifiedReportHtml(incident, 'metric');

    expect(htmlMetric).toContain('KM/H');
    expect(htmlMetric).toContain('Speed (KM/H)');
  });
});
