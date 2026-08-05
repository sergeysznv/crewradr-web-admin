// src/components/reports/ScheduledReports.tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useReportTemplates } from '@/hooks/queries/useReportTemplates';
import { useScheduledReports, useSaveScheduledReport } from '@/hooks/queries/useScheduledReports';
import { useSnackbar } from '@/components/shared/Snackbar';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import type { ScheduledReport } from '@/types/tier';

/**
 * Scheduled Reports (Admiral) — list, toggle, and create per-crew report
 * delivery schedules via the save_scheduled_report / get_scheduled_reports
 * RPCs. Mirrors AlertRuleBuilder's list + create layout.
 */
export function ScheduledReports() {
  const { t } = useT();
  const { settings, isInLockout } = useTier();
  const { showSuccess, showError } = useSnackbar();
  const crewId = settings?.crewId ?? null;

  const [templateId, setTemplateId] = useState('');
  const [schedule, setSchedule] = useState('');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [recipients, setRecipients] = useState('');

  const { data: templates = [] } = useReportTemplates(crewId);
  const { data: schedules = [] } = useScheduledReports(crewId);
  const saveMutation = useSaveScheduledReport(crewId);

  const splitRecipients = (raw: string): string[] =>
    raw
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

  const handleCreate = () => {
    saveMutation.mutate(
      {
        templateId,
        schedule: schedule.trim(),
        format,
        recipients: splitRecipients(recipients),
        enabled: true,
      },
      {
        onSuccess: () => {
          showSuccess(t('webReportsScheduledSaved'));
          setSchedule('');
          setRecipients('');
        },
        onError: () => showError(t('webReportsScheduledSaveFailed')),
      },
    );
  };

  const toggleSchedule = (s: ScheduledReport) => {
    saveMutation.mutate(
      {
        id: s.id,
        templateId: s.templateId,
        schedule: s.schedule,
        format: s.format,
        recipients: s.recipients,
        enabled: !s.enabled,
      },
      {
        onError: () => showError(t('webReportsScheduledToggleFailed')),
      },
    );
  };

  const canCreate =
    !!crewId && !!templateId && !!schedule.trim() && splitRecipients(recipients).length > 0;

  return (
    <TierGateGuard minTier="admiral" fallback={null}>
      <section className="space-y-md">
        <div>
          <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsScheduledTitle')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsScheduledDesc')}</p>
        </div>

        {/* Existing schedules */}
        {schedules.length > 0 && (
          <div>
            <ul className="space-y-2">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 ${
                    s.enabled ? 'border-outline' : 'border-outline/60 opacity-70'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-on-surface">
                      {s.templateName}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {t('webReportsScheduledSummary', {
                        schedule: s.schedule,
                        format: s.format.toUpperCase(),
                        count: s.recipients.length,
                      })}
                    </span>
                    {s.lastRanAt && (
                      <span className="mt-0.5 block text-[10px] text-on-surface-variant/60">
                        {t('webReportsScheduledLastRan', { time: new Date(s.lastRanAt).toLocaleString() })}
                        {s.nextRunAt &&
                          ` · ${t('webReportsScheduledNextRun', { time: new Date(s.nextRunAt).toLocaleString() })}`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSchedule(s)}
                    disabled={saveMutation.isPending || isInLockout}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                      s.enabled
                        ? 'bg-success/15 text-success hover:bg-success/25'
                        : 'bg-on-surface-variant/10 text-on-surface-variant hover:bg-on-surface-variant/20'
                    }`}
                  >
                    {s.enabled ? t('webAlertsRulesActive') : t('webAlertsRulesPaused')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* New schedule form */}
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{t('webReportsScheduledAdd')}</h3>
          <div className="mt-2 space-y-4 rounded-lg border border-outline bg-surface p-4">
            <div>
              <label htmlFor="scheduled-report-template" className="text-sm font-semibold text-on-surface">
                {t('webReportsScheduledTemplateLabel')}
              </label>
              <select
                id="scheduled-report-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templates.length === 0}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {templates.length === 0
                    ? t('webReportsScheduledNoTemplates')
                    : t('webReportsScheduledSelectTemplate')}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="scheduled-report-schedule" className="text-sm font-semibold text-on-surface">
                  {t('webReportsScheduledScheduleLabel')}
                </label>
                <input
                  id="scheduled-report-schedule"
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder={t('webReportsScheduledSchedulePlaceholder')}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="scheduled-report-format" className="text-sm font-semibold text-on-surface">
                  {t('webReportsScheduledFormatLabel')}
                </label>
                <select
                  id="scheduled-report-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="scheduled-report-recipients" className="text-sm font-semibold text-on-surface">
                {t('webReportsScheduledRecipientsLabel')}
              </label>
              <input
                id="scheduled-report-recipients"
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder={t('webReportsScheduledRecipientsPlaceholder')}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || isInLockout || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {saveMutation.isPending ? t('webReportsScheduledSaving') : t('webReportsScheduledAdd')}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {schedules.length === 0 && (
          <div className="rounded-lg border border-outline bg-surface p-8 text-center">
            <p className="text-sm font-medium text-on-surface-variant">{t('webReportsScheduledEmpty')}</p>
            <p className="mt-1 text-xs text-on-surface-variant/60">{t('webReportsScheduledEmptyDesc')}</p>
          </div>
        )}
      </section>
    </TierGateGuard>
  );
}
