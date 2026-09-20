// src/components/reports/ExportPresets.tsx
'use client';

import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useSupabase } from '@/hooks/useSupabase';
import { useCurrency } from '@/hooks/useCurrency';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { convertFromUsd } from '@/lib/currency';
import { getWebTripList } from '@/lib/rpc';
import { tierHistoryDays } from '@/lib/tier';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import {
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  TriangleAlert,
} from 'lucide-react';

type ExportFormat = 'csv' | 'json' | 'pdf';

interface ExportOption {
  id: string;
  labelKey: string;
  descriptionKey: string;
  format: ExportFormat;
}

const PERSONAL_EXPORT_OPTIONS: ExportOption[] = [
  { id: 'personal_csv', labelKey: 'webReportsPersonalCsvLabel', descriptionKey: 'webReportsPersonalCsvDesc', format: 'csv' },
  { id: 'personal_json', labelKey: 'webReportsPersonalJsonLabel', descriptionKey: 'webReportsPersonalJsonDesc', format: 'json' },
];

const FLEET_EXPORT_OPTIONS: ExportOption[] = [
  { id: 'fleet_trips_csv', labelKey: 'webReportsFleetTripsLabel', descriptionKey: 'webReportsFleetTripsDesc', format: 'csv' },
  { id: 'fleet_alerts_csv', labelKey: 'webReportsFleetAlertsLabel', descriptionKey: 'webReportsFleetAlertsDesc', format: 'csv' },
  { id: 'fleet_irs_mileage_csv', labelKey: 'webReportsIrsMileageLabel', descriptionKey: 'webReportsIrsMileageDesc', format: 'csv' },
  { id: 'fleet_eco_roi_csv', labelKey: 'webReportsEcoAuditLabel', descriptionKey: 'webReportsEcoAuditDesc', format: 'csv' },
  { id: 'fleet_activity_pdf', labelKey: 'webReportsActivityPdfLabel', descriptionKey: 'webReportsActivityPdfDesc', format: 'pdf' },
];

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
  csv: FileSpreadsheet,
  json: FileJson,
  pdf: FileText,
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Download a remote file (signed URL from the generate-fleet-export function)
// as a blob so the browser saves it under the server-provided filename.
async function downloadFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function jsonToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

// Map the fleet export cards to the dataset the Edge Function generates.
// (CSV exports are per-dataset; JSON exports contain everything.)
const FLEET_KINDS: Record<string, 'trips' | 'alerts' | 'all'> = {
  fleet_trips_csv: 'trips',
  fleet_alerts_csv: 'alerts',
};

function ExportCard({ option, busy, soon, disabled, onExport }: {
  option: ExportOption;
  busy: boolean;
  soon?: boolean;
  disabled?: boolean;
  onExport: (option: ExportOption) => void;
}) {
  const { t } = useT();
  const FormatIcon = FORMAT_ICONS[option.format];
  return (
    <button
      type="button"
      onClick={() => onExport(option)}
      disabled={disabled || busy || soon}
      className="flex flex-col gap-1.5 rounded-lg border border-outline bg-surface p-4 text-start transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <FormatIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {t(option.labelKey)}
      </span>
      <p className="text-xs text-on-surface-variant">{t(option.descriptionKey)}</p>
      <span className="mt-1 inline-flex items-center gap-1 self-start rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : soon ? (
          <Lock className="h-3 w-3" aria-hidden="true" />
        ) : null}
        {soon ? t('webReportsComingSoon') : option.format}
      </span>
    </button>
  );
}

export function ExportPresets() {
  const { t, locale } = useT();
  const { tier, settings } = useTier();
  const supabase = useSupabase();
  const { currency } = useCurrency();
  const { system } = useMeasurementSystem();
  const [exporting, setExporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string; href?: string; downloadUrl?: string; fileName?: string } | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailing, setEmailing] = useState(false);

  const crewId = settings?.crewId ?? '';
  const days = settings?.historyDays ?? tierHistoryDays(tier);

  const runExport = async (option: ExportOption, fn: () => Promise<void>) => {
    setExporting(option.id);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : t('webReportsExportFailed');
      setNotice({ kind: 'error', text: message });
    } finally {
      setExporting(null);
    }
  };

  const handlePersonalExport = (option: ExportOption) =>
    runExport(option, async () => {
      const { data, error } = await supabase.rpc('get_web_personal_export', { p_format: option.format });
      if (error) throw error;
      const payload = data as {
        exportedAt: string;
        format: string;
        profile: unknown[];
        trips: Record<string, unknown>[];
        checkIns: unknown[];
      } | null;
      if (!payload) throw new Error(t('webReportsExportFailed'));
      if (option.format === 'csv') {
        downloadFile(jsonToCsv(payload.trips ?? []), 'crewradr-personal-export.csv', 'text/csv');
      } else {
        downloadFile(JSON.stringify(payload, null, 2), 'crewradr-personal-export.json', 'application/json');
      }
    });

  const handleFleetExport = (option: ExportOption) =>
    runExport(option, async () => {
      if (!crewId) throw new Error(t('webReportsExportFailed'));

      // Option: IRS Standard Mileage Deduction Log
      if (option.id === 'fleet_irs_mileage_csv') {
        const trips = await getWebTripList(supabase, crewId, days);
        const isImp = system === 'imperial';
        const distUnit = isImp ? 'Miles' : 'Kilometers';
        const irsRateUsdPerMile = 0.67; // Official IRS standard business mileage rate
        const rateConverted = convertFromUsd(irsRateUsdPerMile, currency);

        const headers = [
          'Date',
          'Trip ID',
          'Driver',
          'Start Time',
          'End Time',
          'Business Purpose',
          `Distance (${distUnit})`,
          `IRS Standard Rate per Mile (${currency})`,
          `Tax Deduction Amount (${currency})`,
        ];

        let totalMiles = 0;
        let totalDeductionUsd = 0;

        const rows = trips.map((tr) => {
          const miles = tr.distance_miles || 0;
          totalMiles += miles;
          const deductionUsd = miles * irsRateUsdPerMile;
          totalDeductionUsd += deductionUsd;

          const distDisplay = isImp ? miles : miles * 1.60934;
          const deductionDisplay = convertFromUsd(deductionUsd, currency);
          const dateStr = tr.started_at ? new Date(tr.started_at).toLocaleDateString() : '--';

          return [
            `"${dateStr}"`,
            `"${tr.id}"`,
            `"${(tr.member_name || 'Member').replace(/"/g, '""')}"`,
            `"${tr.started_at || ''}"`,
            `"${tr.ended_at || 'In Progress'}"`,
            '"Fleet Operations / Business Transportation"',
            distDisplay.toFixed(2),
            rateConverted.toFixed(3),
            deductionDisplay.toFixed(2),
          ].join(',');
        });

        const totalDistDisplay = isImp ? totalMiles : totalMiles * 1.60934;
        const totalDeductionDisplay = convertFromUsd(totalDeductionUsd, currency);
        rows.push([
          '"TOTAL"',
          '""',
          '""',
          '""',
          '""',
          '"SUMMARY TOTAL"',
          totalDistDisplay.toFixed(2),
          '""',
          totalDeductionDisplay.toFixed(2),
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const filename = `irs-mileage-deduction-log-${new Date().toISOString().slice(0, 10)}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
        setNotice({
          kind: 'success',
          text: t('webReportsExportReady', { filename }),
        });
        return;
      }

      // Option: Eco-Driving & SmartWay Fleet ROI Audit
      if (option.id === 'fleet_eco_roi_csv') {
        const trips = await getWebTripList(supabase, crewId, days);
        const isImp = system === 'imperial';
        const distUnit = isImp ? 'Miles' : 'Kilometers';
        const fuelUnit = isImp ? 'Gallons' : 'Liters';
        const carbonUnit = isImp ? 'lbs CO2' : 'kg CO2';

        const headers = [
          'Trip ID',
          'Driver',
          'Date',
          `Distance (${distUnit})`,
          'Duration (min)',
          'Idle Time (hours)',
          `Wasted Idle Fuel (${fuelUnit})`,
          `Fuel Waste Cost (${currency})`,
          `Carbon Emissions (${carbonUnit})`,
          'Fleet Eco Score (0-100)',
        ];

        let totalMiles = 0;
        let totalIdleHours = 0;
        let totalFuelWasteGal = 0;
        let totalWasteCostUsd = 0;
        let totalCarbonKg = 0;

        const rows = trips.map((tr) => {
          const miles = tr.distance_miles || 0;
          const durationHours = (tr.duration_min || 0) / 60;
          totalMiles += miles;

          const avgMph = tr.avg_speed_ms ? tr.avg_speed_ms * 2.23694 : (durationHours > 0 ? miles / durationHours : 0);
          const idleHours = avgMph < 15 && durationHours > 0.2 ? Math.round(durationHours * 0.35 * 10) / 10 : 0.1;
          totalIdleHours += idleHours;

          const idleFuelGal = idleHours * 0.60;
          totalFuelWasteGal += idleFuelGal;

          const wasteUsd = idleFuelGal * 3.85;
          totalWasteCostUsd += wasteUsd;

          const carbonKg = (miles / 12) * 8.887;
          totalCarbonKg += carbonKg;

          const speedPenalty = tr.max_speed_ms > 35 ? 15 : tr.max_speed_ms > 30 ? 8 : 0;
          const alertPenalty = Math.min(25, (tr.alert_count || 0) * 5);
          const idlePenalty = Math.min(20, idleHours * 10);
          const score = Math.max(40, Math.min(100, Math.round(98 - speedPenalty - alertPenalty - idlePenalty)));

          const distDisplay = isImp ? miles : miles * 1.60934;
          const fuelDisplay = isImp ? idleFuelGal : idleFuelGal * 3.78541;
          const costDisplay = convertFromUsd(wasteUsd, currency);
          const carbonDisplay = isImp ? carbonKg * 2.20462 : carbonKg;

          return [
            `"${tr.id}"`,
            `"${(tr.member_name || 'Member').replace(/"/g, '""')}"`,
            `"${tr.started_at ? new Date(tr.started_at).toLocaleDateString() : ''}"`,
            distDisplay.toFixed(2),
            tr.duration_min || 0,
            idleHours.toFixed(1),
            fuelDisplay.toFixed(2),
            costDisplay.toFixed(2),
            carbonDisplay.toFixed(1),
            score,
          ].join(',');
        });

        const totalDistDisplay = isImp ? totalMiles : totalMiles * 1.60934;
        const totalFuelDisplay = isImp ? totalFuelWasteGal : totalFuelWasteGal * 3.78541;
        const totalCostDisplay = convertFromUsd(totalWasteCostUsd, currency);
        const totalCarbonDisplay = isImp ? totalCarbonKg * 2.20462 : totalCarbonKg;

        rows.push([
          '"TOTAL"',
          '""',
          '""',
          totalDistDisplay.toFixed(2),
          '""',
          totalIdleHours.toFixed(1),
          totalFuelDisplay.toFixed(2),
          totalCostDisplay.toFixed(2),
          totalCarbonDisplay.toFixed(1),
          '""',
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const filename = `fleet-eco-roi-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
        setNotice({
          kind: 'success',
          text: t('webReportsExportReady', { filename }),
        });
        return;
      }

      // S8: generate-fleet-export Edge Function performs the captain gate,
      // generates the file, uploads it to private storage, writes the audit
      // trail, and returns a signed download URL synchronously.
      const { data: { session } } = await supabase.auth.getSession();
      const fnHeaders: Record<string, string> = {};
      if (session?.access_token) fnHeaders['Authorization'] = `Bearer ${session.access_token}`;
      const { data, error } = await supabase.functions.invoke('generate-fleet-export', {
        body: {
          crew_id: crewId,
          format: option.format,
          kind: FLEET_KINDS[option.id] ?? 'all',
          date_range: { days },
        },
        headers: fnHeaders,
      });
      if (error) {
        const ctx = (error as { context?: unknown }).context;
        const serverMessage =
          ctx && typeof ctx === 'object' && 'error' in ctx
            ? String((ctx as { error: unknown }).error)
            : '';
        throw new Error(serverMessage || t('webReportsExportFailed'));
      }
      const payload = data as {
        status: string;
        downloadUrl: string;
        fileName: string;
      } | null;
      if (!payload?.downloadUrl) throw new Error(t('webReportsExportFailed'));
      setNotice({
        kind: 'success',
        text: t('webReportsExportReady', { filename: payload.fileName }),
        href: payload.downloadUrl,
        downloadUrl: payload.downloadUrl,
        fileName: payload.fileName,
      });
    });

  return (
    <div className="space-y-sz-lg">
      {/* Personal data — GDPR Art. 20, always available, no tier gate */}
      <section className="space-y-sz-md">
        <div>
          <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsMyDataTitle')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsMyDataDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-sz-md sm:grid-cols-2">
          {PERSONAL_EXPORT_OPTIONS.map((opt) => (
            <ExportCard key={opt.id} option={opt} busy={exporting === opt.id} onExport={handlePersonalExport} />
          ))}
        </div>
      </section>

      {/* Fleet reports — captain+ tier AND captain/co-captain role
          (get_web_fleet_export is role-gated server-side). Tier-denied crews
          get the upgrade prompt; role-denied members get a captains-only
          message instead of a confusing server error. */}
      <RoleGate
        fallback={
          <section className="flex items-center gap-3 rounded-lg border border-outline bg-surface p-6">
            <Lock className="h-6 w-6 shrink-0 text-on-surface-variant opacity-60" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-on-surface">{t('webReportsFleetTitle')}</h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">{t('webRoleGateDenied')}</p>
            </div>
          </section>
        }
      >
        <TierGateGuard
          minTier="captain"
          fallback={
            <section className="flex items-center gap-3 rounded-lg border border-outline bg-surface p-6">
              <Lock className="h-6 w-6 shrink-0 text-on-surface-variant opacity-60" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-on-surface">{t('webReportsFleetTitle')}</h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">{t('webUpgradeRequired')}</p>
              </div>
            </section>
          }
        >
          <section className="space-y-sz-md">
            <div>
              <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsFleetTitle')}</h2>
              <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsFleetDesc', { days })}</p>
            </div>
            <div className="grid grid-cols-1 gap-sz-md sm:grid-cols-3">
              {FLEET_EXPORT_OPTIONS.map((opt) => (
                <ExportCard
                  key={opt.id}
                  option={opt}
                  busy={exporting === opt.id}
                  disabled={!crewId}
                  onExport={handleFleetExport}
                />
              ))}
            </div>
          </section>
        </TierGateGuard>
      </RoleGate>

      {/* Export status notice */}
      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            notice.kind === 'success'
              ? 'border-success/30 bg-success-container text-on-success-container'
              : 'border-outline bg-error-container text-on-error-container'
          }`}
        >
          {notice.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{notice.text}</span>
          {notice.kind === 'success' && notice.downloadUrl && (
            <div className="ms-auto flex items-center gap-2 shrink-0">
              <a
                href={notice.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-success/30 bg-white px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10 transition-colors dark:bg-zinc-800"
              >
                {t('webReportsDownload')}
              </a>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder={t('webReportsEmailPlaceholder')}
                className="rounded-lg border border-success/30 bg-white px-3 py-1.5 text-xs text-on-surface w-36 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                onClick={async () => {
                  if (!emailTo) return;
                  setEmailing(true);
                  try {
                    const { error } = await supabase.functions.invoke('send-email', {
                      body: {
                        to: [emailTo],
                        subject: `Fleet Export — ${notice.fileName ?? new Date().toISOString().slice(0, 10)}`,
                        text: `Your fleet export is ready.`,
                        downloadUrl: notice.downloadUrl,
                        fileName: notice.fileName,
                        lang: locale,
                      },
                    });
                    if (error) throw error;
                    setEmailTo('');
                    alert(t('webReportsEmailSent'));
                  } catch {
                    alert(t('webReportsEmailFailed'));
                  }
                  setEmailing(false);
                }}
                disabled={emailing || !emailTo}
                className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-on-success hover:opacity-90 disabled:opacity-50"
              >
                {emailing ? t('webReportsSending') : t('webReportsEmailButton')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
