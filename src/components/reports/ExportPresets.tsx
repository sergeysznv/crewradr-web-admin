// src/components/reports/ExportPresets.tsx
'use client';

import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useSupabase } from '@/hooks/useSupabase';
import { tierHistoryDays } from '@/lib/tier';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
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
      className="flex flex-col gap-1.5 rounded-lg border border-outline bg-surface p-4 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
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
  const { t } = useT();
  const { tier, settings } = useTier();
  const supabase = useSupabase();
  const [exporting, setExporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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
      const { error } = await supabase.rpc('get_web_fleet_export', {
        p_crew_id: crewId,
        p_format: option.format,
        p_date_range: { days },
      });
      if (error) throw error;
      setNotice({ kind: 'success', text: t('webReportsExportQueued') });
    });

  return (
    <div className="space-y-lg">
      {/* Personal data — GDPR Art. 20, always available, no tier gate */}
      <section className="space-y-md">
        <div>
          <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsMyDataTitle')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsMyDataDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {PERSONAL_EXPORT_OPTIONS.map((opt) => (
            <ExportCard key={opt.id} option={opt} busy={exporting === opt.id} onExport={handlePersonalExport} />
          ))}
        </div>
      </section>

      {/* Fleet reports — tier-gated (firstMate+) */}
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
        <section className="space-y-md">
          <div>
            <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsFleetTitle')}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsFleetDesc', { days })}</p>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            {FLEET_EXPORT_OPTIONS.map((opt) => (
              <ExportCard
                key={opt.id}
                option={opt}
                busy={exporting === opt.id}
                soon={opt.format === 'pdf'}
                disabled={!crewId}
                onExport={handleFleetExport}
              />
            ))}
          </div>
        </section>
      </TierGateGuard>

      {/* Export status notice */}
      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            notice.kind === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {notice.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {notice.text}
        </div>
      )}
    </div>
  );
}
