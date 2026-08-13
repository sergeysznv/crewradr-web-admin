// src/components/reports/ScheduledReports.tsx
'use client';

import { useState } from 'react';
import { Loader2, Calendar, Clock, ChevronDown } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useReportTemplates } from '@/hooks/queries/useReportTemplates';
import { useScheduledReports, useSaveScheduledReport } from '@/hooks/queries/useScheduledReports';
import { useSnackbar } from '@/components/shared/Snackbar';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import type { ScheduledReport } from '@/types/tier';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

const WEEKS_OF_MONTH = [
  { value: '1', label: '1st week' },
  { value: '2', label: '2nd week' },
  { value: '3', label: '3rd week' },
  { value: '4', label: '4th week' },
];

function buildCron(freq: Frequency, dayOfWeek: string, dayOfMonth: string, weekOfMonth: string, time: string): string {
  const [hour, minute] = (time || '09:00').split(':').map(Number);
  const m = minute ?? 0;
  const h = hour ?? 9;
  switch (freq) {
    case 'daily':    return `${m} ${h} * * *`;
    case 'weekly':   return `${m} ${h} * * ${dayOfWeek || '1'}`;
    case 'monthly':  return `${m} ${h} ${dayOfMonth || '1'} * *`;
    case 'quarterly': return `${m} ${h} * */3 *`;
    default: return `${m} ${h} * * *`;
  }
}

function describeCron(freq: Frequency, dayOfWeek: string, dayOfMonth: string, weekOfMonth: string, time: string): string {
  const [hour, minute] = (time || '09:00').split(':').map(Number);
  const timeStr = `${String(hour ?? 9).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;
  const dow = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label ?? 'Monday';
  switch (freq) {
    case 'daily':    return `Every day at ${timeStr}`;
    case 'weekly':   return `Every ${dow} at ${timeStr}`;
    case 'monthly':  return `Day ${dayOfMonth || '1'} of each month at ${timeStr}`;
    case 'quarterly': return `Every 3 months at ${timeStr}`;
    default: return `${timeStr} daily`;
  }
}

export function ScheduledReports() {
  const { t } = useT();
  const { settings, isInLockout } = useTier();
  const { showSuccess, showError } = useSnackbar();
  const crewId = settings?.crewId ?? null;

  const [templateId, setTemplateId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [weekOfMonth, setWeekOfMonth] = useState('1');
  const [time, setTime] = useState('09:00');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [recipients, setRecipients] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: templates = [] } = useReportTemplates(crewId);
  const { data: schedules = [] } = useScheduledReports(crewId);
  const saveMutation = useSaveScheduledReport(crewId);

  const splitRecipients = (raw: string): string[] =>
    raw.split(',').map((email) => email.trim()).filter(Boolean);

  const handleCreate = () => {
    const cron = buildCron(frequency, dayOfWeek, dayOfMonth, weekOfMonth, time);
    saveMutation.mutate(
      {
        templateId,
        schedule: cron,
        format,
        recipients: splitRecipients(recipients),
        enabled: true,
      },
      {
        onSuccess: () => {
          showSuccess(t('webReportsScheduledSaved'));
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
    !!crewId && !!templateId && splitRecipients(recipients).length > 0;

  const showDayOfWeek = frequency === 'weekly' || frequency === 'quarterly';
  const showDayOfMonth = frequency === 'monthly';
  const showWeekOfMonth = frequency === 'quarterly';

  return (
    <TierGateGuard minTier="admiral" fallback={null}>
      <section className="space-y-sz-md">
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
                      {s.schedule} · {s.format.toUpperCase()} · {s.recipients.length} recipient(s)
                    </span>
                    {s.lastRanAt && (
                      <span className="mt-0.5 block text-[10px] text-on-surface-variant">
                        Last: {new Date(s.lastRanAt).toLocaleString()}
                        {s.nextRunAt && ` · Next: ${new Date(s.nextRunAt).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSchedule(s)}
                    disabled={saveMutation.isPending || isInLockout}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                      s.enabled
                        ? 'bg-success-container text-on-success-container hover:bg-success/25'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-on-surface-variant/20'
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
            {/* Template */}
            <div>
              <label className="text-sm font-semibold text-on-surface">{t('webReportsScheduledTemplateLabel')}</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templates.length === 0}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none disabled:opacity-50"
              >
                <option value="">{templates.length === 0 ? t('webReportsScheduledNoTemplates') : t('webReportsScheduledSelectTemplate')}</option>
                {templates.map((tmpl) => (<option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>))}
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-sm font-semibold text-on-surface">Frequency</label>
              <div className="mt-1 flex gap-1">
                {(['daily', 'weekly', 'monthly', 'quarterly'] as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      frequency === f
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-hover'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {showDayOfWeek && (
                <div>
                  <label className="text-sm font-semibold text-on-surface">Day of week</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                  </select>
                </div>
              )}
              {showDayOfMonth && (
                <div>
                  <label className="text-sm font-semibold text-on-surface">Day of month</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              {showWeekOfMonth && (
                <div>
                  <label className="text-sm font-semibold text-on-surface">Week of month</label>
                  <select
                    value={weekOfMonth}
                    onChange={(e) => setWeekOfMonth(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                  >
                    {WEEKS_OF_MONTH.map((w) => (<option key={w.value} value={w.value}>{w.label}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-on-surface">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Schedule preview */}
            <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono">{describeCron(frequency, dayOfWeek, dayOfMonth, weekOfMonth, time)}</span>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-on-surface">Start date (optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-on-surface">End date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-sm font-semibold text-on-surface">{t('webReportsScheduledFormatLabel')}</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            {/* Recipients */}
            <div>
              <label className="text-sm font-semibold text-on-surface">{t('webReportsScheduledRecipientsLabel')}</label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder={t('webReportsScheduledRecipientsPlaceholder')}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || isInLockout || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsScheduledEmptyDesc')}</p>
          </div>
        )}
      </section>
    </TierGateGuard>
  );
}
