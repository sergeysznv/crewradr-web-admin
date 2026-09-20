// src/components/trips/CrashBlackboxModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { tierRank } from '@/lib/utils';
import { formatSpeedFromMph } from '@/lib/units';
import {
  reconstructCrashIncident,
  generateCertifiedReportHtml,
  type CrashBlackboxIncident,
} from '@/lib/crashBlackbox';
import type { TripDetail } from '@/types/tier';
import {
  ShieldAlert,
  X,
  FileText,
  Lock,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Gauge,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface CrashBlackboxModalProps {
  trip: TripDetail;
  alertTimestamp?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CrashBlackboxModal({
  trip,
  alertTimestamp,
  isOpen,
  onClose,
}: CrashBlackboxModalProps) {
  const { t } = useT();
  const { tier } = useCrew();
  const { system } = useMeasurementSystem();
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const incident: CrashBlackboxIncident = useMemo(() => {
    return reconstructCrashIncident(trip, alertTimestamp);
  }, [trip, alertTimestamp]);

  if (!isOpen) return null;

  const isPaidTier = tierRank(tier) >= 1; // First Mate or higher

  const handlePrintOrPdf = () => {
    if (!isPaidTier) return;
    const html = generateCertifiedReportHtml(incident, system);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleExportCsv = () => {
    if (!isPaidTier) return;
    const speedUnit = system === 'imperial' ? 'mph' : 'km/h';
    const headers = [
      'Time Offset (sec)',
      'Timestamp UTC',
      `Speed (${speedUnit})`,
      'Longitudinal G (Gx)',
      'Lateral G (Gy)',
      'Vertical G (Gz)',
      'Total Impulse (G)',
      'Heading (deg)',
      'Screen Unlocked',
    ];
    const rows = incident.telemetryTrace.map((p) => {
      const spd = system === 'imperial' ? p.speedMph : p.speedMph * 1.60934;
      return [
        p.timeOffsetSec.toFixed(1),
        `"${p.timestamp}"`,
        spd.toFixed(1),
        p.gForceX.toFixed(2),
        p.gForceY.toFixed(2),
        p.gForceZ.toFixed(2),
        p.totalGForce.toFixed(2),
        p.headingDeg,
        p.phoneScreenUnlocked ? 'TRUE' : 'FALSE',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `blackbox-${incident.incidentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = { top: 16, right: 24, bottom: 24, left: 36 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Max G scale for graph (clamp between 6G and 16G)
  const maxG = Math.max(8, Math.ceil(incident.peakGForce * 1.1));
  const pointsCount = incident.telemetryTrace.length;

  const getX = (index: number) => padding.left + (index / (pointsCount - 1)) * graphWidth;
  const getY = (val: number, maxVal: number) =>
    padding.top + graphHeight - (Math.min(val, maxVal) / maxVal) * graphHeight;

  // Polyline coordinates for Total G and Speed
  const totalGPoints = incident.telemetryTrace
    .map((p, i) => `${getX(i)},${getY(p.totalGForce, maxG)}`)
    .join(' ');

  const maxSpeedValue = Math.max(30, incident.speedAtImpactMph * 1.2);
  const speedPoints = incident.telemetryTrace
    .map((p, i) => `${getX(i)},${getY(p.speedMph, maxSpeedValue)}`)
    .join(' ');

  const activePoint =
    selectedPointIndex !== null && incident.telemetryTrace[selectedPointIndex]
      ? incident.telemetryTrace[selectedPointIndex]
      : incident.telemetryTrace[incident.telemetryTrace.length - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blackbox-modal-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-outline bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline px-6 py-4 bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/15 text-error">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="blackbox-modal-title" className="text-lg font-bold text-on-surface">
                  {t('crashBlackboxTitle')}
                </h2>
                <span className="rounded-full bg-error-container px-2.5 py-0.5 text-xs font-mono font-bold text-on-error-container">
                  {incident.incidentId}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {t('crashBlackboxSubtitleActive')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Certified Collision Telemetry Summary Box */}
          <div className="rounded-xl border-2 border-error/40 bg-error/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-error/20 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-error flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                {t('crashBlackboxCertifiedTelemetry')}
              </span>
              <span className="text-xs text-on-surface-variant">
                {new Date(incident.crashTime).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Peak Force */}
              <div className="rounded-lg border border-outline bg-surface p-3">
                <span className="text-xs font-medium text-on-surface-variant block">
                  {t('crashBlackboxPeakForce')}
                </span>
                <span className="text-xl font-extrabold text-error">
                  {incident.peakGForce.toFixed(2)} G
                </span>
              </div>

              {/* Pre-Impact Speed */}
              <div className="rounded-lg border border-outline bg-surface p-3">
                <span className="text-xs font-medium text-on-surface-variant block">
                  {t('crashBlackboxPreImpactSpeed')}
                </span>
                <span className="text-xl font-extrabold text-on-surface">
                  {formatSpeedFromMph(incident.speedAtImpactMph, system)}
                </span>
              </div>

              {/* Driver Distraction Audit */}
              <div className="col-span-2 rounded-lg border border-outline bg-surface p-3">
                <span className="text-xs font-medium text-on-surface-variant block">
                  {t('crashBlackboxDistractionAudit')}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {incident.phoneDistractedAtImpact ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-error/15 px-2.5 py-1 text-xs font-bold text-error">
                      <Smartphone className="h-4 w-4" />
                      {t('crashBlackboxDeviceUnlocked')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('crashBlackboxVerifiedLocked')}
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {incident.phoneDistractedAtImpact ? 'High Liability' : 'Exonerating Evidence'}
                  </span>
                </div>
              </div>
            </div>

            {incident.locationAddress && (
              <div className="mt-3 text-xs text-on-surface-variant">
                {t('crashBlackboxLocation', { location: incident.locationAddress })}
              </div>
            )}
          </div>

          {/* 30-Second 20Hz Waveform Chart */}
          <div className="rounded-xl border border-outline bg-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <span>30s Pre-Impact Telemetry Waveform (G-Force & Velocity)</span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-error font-medium">
                  <span className="inline-block h-2 w-3 rounded-xs bg-error" /> Total G
                </span>
                <span className="flex items-center gap-1 text-primary font-medium">
                  <span className="inline-block h-2 w-3 rounded-xs bg-primary" /> Speed ({system === 'imperial' ? 'mph' : 'km/h'})
                </span>
              </div>
            </div>

            {/* Interactive SVG Graph */}
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 select-none cursor-crosshair"
              >
                {/* Grid horizontal lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                  <line
                    key={i}
                    x1={padding.left}
                    y1={padding.top + graphHeight * ratio}
                    x2={svgWidth - padding.right}
                    y2={padding.top + graphHeight * ratio}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Speed Line (Primary) */}
                <polyline
                  fill="none"
                  stroke="var(--color-primary, #0284c7)"
                  strokeWidth="2"
                  points={speedPoints}
                  strokeLinecap="round"
                />

                {/* Total G Line (Error / Red) */}
                <polyline
                  fill="none"
                  stroke="var(--color-error, #dc2626)"
                  strokeWidth="2.5"
                  points={totalGPoints}
                  strokeLinecap="round"
                />

                {/* Vertical Cursor at activePoint */}
                {selectedPointIndex !== null && (
                  <line
                    x1={getX(selectedPointIndex)}
                    y1={padding.top}
                    x2={getX(selectedPointIndex)}
                    y2={padding.top + graphHeight}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Clickable / Hoverable hitboxes */}
                {incident.telemetryTrace.map((p, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(p.totalGForce, maxG)}
                    r={i === (selectedPointIndex ?? pointsCount - 1) ? 5 : 2}
                    className="transition-all fill-error stroke-surface stroke-2 cursor-pointer hover:r-6"
                    onMouseEnter={() => setSelectedPointIndex(i)}
                    onClick={() => setSelectedPointIndex(i)}
                  />
                ))}

                {/* X Axis Labels */}
                <text x={padding.left} y={svgHeight - 6} fontSize="10" fill="currentColor" opacity="0.6">
                  -30.0s
                </text>
                <text x={svgWidth / 2 - 12} y={svgHeight - 6} fontSize="10" fill="currentColor" opacity="0.6">
                  -15.0s
                </text>
                <text x={svgWidth - padding.right - 28} y={svgHeight - 6} fontSize="10" fill="currentColor" opacity="0.6" fontWeight="bold">
                  0.0s (Impact)
                </text>
              </svg>
            </div>

            {/* Active Hover Point Details */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs">
              <span className="font-semibold text-on-surface">
                T: {activePoint.timeOffsetSec === 0 ? '0.0s (Impact)' : `${activePoint.timeOffsetSec.toFixed(1)}s`}
              </span>
              <span>
                Speed: <strong className="text-primary">{formatSpeedFromMph(activePoint.speedMph, system)}</strong>
              </span>
              <span>
                Total G: <strong className="text-error">{activePoint.totalGForce.toFixed(2)} G</strong>
              </span>
              <span>
                Gx: <strong>{activePoint.gForceX.toFixed(2)}</strong> · Gy: <strong>{activePoint.gForceY.toFixed(2)}</strong> · Gz: <strong>{activePoint.gForceZ.toFixed(2)}</strong>
              </span>
              <span>
                Heading: <strong>{activePoint.headingDeg}°</strong>
              </span>
            </div>
          </div>

          {/* Chronological Telemetry Table */}
          <div className="rounded-xl border border-outline bg-surface overflow-hidden">
            <div className="border-b border-outline px-4 py-3 bg-surface-container">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Chronological Pre-Impact Log (Sampled from 20Hz Buffer)
              </h4>
            </div>
            <div className="max-h-52 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-container-high text-on-surface-variant font-semibold border-b border-outline">
                  <tr>
                    <th className="py-2 px-3">Offset</th>
                    <th className="py-2 px-3">Speed</th>
                    <th className="py-2 px-3">Longitudinal (Gx)</th>
                    <th className="py-2 px-3">Lateral (Gy)</th>
                    <th className="py-2 px-3">Vertical (Gz)</th>
                    <th className="py-2 px-3">Total G</th>
                    <th className="py-2 px-3">Heading</th>
                    <th className="py-2 px-3">Phone Screen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40">
                  {incident.telemetryTrace.map((pt, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedPointIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        idx === (selectedPointIndex ?? pointsCount - 1)
                          ? 'bg-primary/10 font-semibold'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      <td className="py-1.5 px-3 font-mono">
                        {pt.timeOffsetSec === 0 ? '0.0s (Impact)' : `${pt.timeOffsetSec.toFixed(1)}s`}
                      </td>
                      <td className="py-1.5 px-3">
                        {formatSpeedFromMph(pt.speedMph, system)}
                      </td>
                      <td className={`py-1.5 px-3 font-mono ${pt.gForceX < -1 ? 'text-error font-bold' : ''}`}>
                        {pt.gForceX.toFixed(2)} G
                      </td>
                      <td className="py-1.5 px-3 font-mono">{pt.gForceY.toFixed(2)} G</td>
                      <td className="py-1.5 px-3 font-mono">{pt.gForceZ.toFixed(2)} G</td>
                      <td className={`py-1.5 px-3 font-mono ${pt.totalGForce > 3 ? 'text-error font-extrabold' : ''}`}>
                        {pt.totalGForce.toFixed(2)} G
                      </td>
                      <td className="py-1.5 px-3">{pt.headingDeg}°</td>
                      <td className="py-1.5 px-3">
                        {pt.phoneScreenUnlocked ? (
                          <span className="text-error font-bold">UNLOCKED</span>
                        ) : (
                          <span className="text-success font-semibold">LOCKED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cryptographic SHA-256 Seal & Legal Disclaimer */}
          <div className="rounded-lg border border-outline/70 bg-surface-container-low p-3.5 text-xs text-on-surface-variant space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface">Cryptographic Hash (SHA-256):</span>
              <code className="rounded-sm bg-surface px-2 py-0.5 font-mono text-[11px] text-primary select-all">
                {incident.cryptographicHash}
              </code>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t('crashBlackboxLegalDisclaimer')}
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline px-6 py-4 bg-surface-container">
          {!isPaidTier ? (
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-on-surface-variant opacity-60" />
              <div>
                <p className="text-xs font-semibold text-on-surface">
                  {t('crashBlackboxUpgradeFeature')}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {t('crashBlackboxLockedNotice')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintOrPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary/90 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>{t('crashBlackboxExportPdf')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>CSV Telemetry</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ms-auto">
            {!isPaidTier && (
              <Link
                href="/settings"
                className="rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 transition-colors"
              >
                Upgrade to First Mate
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-outline bg-surface px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
