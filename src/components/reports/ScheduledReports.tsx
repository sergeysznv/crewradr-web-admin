// src/components/reports/ScheduledReports.tsx
'use client';

import { useState } from 'react';
import { Loader2, Calendar, Clock, ChevronDown, Edit2, Trash2, XCircle, Play, Pause, Plus } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useReportTemplates } from '@/hooks/queries/useReportTemplates';
import { useScheduledReports, useSaveScheduledReport, useDeleteScheduledReport } from '@/hooks/queries/useScheduledReports';
import { useSnackbar } from '@/components/shared/Snackbar';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import type { ScheduledReport } from '@/types/tier';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const DAYS_OF_WEEK = [
  { value: '1', key: 'webReportsDayMonday' },
  { value: '2', key: 'webReportsDayTuesday' },
  { value: '3', key: 'webReportsDayWednesday' },
  { value: '4', key: 'webReportsDayThursday' },
  { value: '5', key: 'webReportsDayFriday' },
  { value: '6', key: 'webReportsDaySaturday' },
  { value: '0', key: 'webReportsDaySunday' },
];

const WEEKS_OF_MONTH = [
  { value: '1', key: 'webReportsWeekFirst' },
  { value: '2', key: 'webReportsWeekSecond' },
  { value: '3', key: 'webReportsWeekThird' },
  { value: '4', key: 'webReportsWeekFourth' },
];

const FREQ_LABEL_KEYS: Record<Frequency, string> = {
  daily: 'webReportsFreqDaily',
  weekly: 'webReportsFreqWeekly',
  monthly: 'webReportsFreqMonthly',
  quarterly: 'webReportsFreqQuarterly',
};

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

function describeCron(t: (key: string, params?: Record<string, string | number>) => string, freq: Frequency, dayOfWeek: string, dayOfMonth: string, weekOfMonth: string, time: string): string {
  const [hour, minute] = (time || '09:00').split(':').map(Number);
  const timeStr = `${String(hour ?? 9).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;
  const dow = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.key ?? 'webReportsDayMonday';
  switch (freq) {
    case 'daily':    return t('webReportsCronDaily', { time: timeStr });
    case 'weekly':   return t('webReportsCronWeekly', { day: t(dow), time: timeStr });
    case 'monthly':  return t('webReportsCronMonthly', { day: dayOfMonth || '1', time: timeStr });
    case 'quarterly': return t('webReportsCronQuarterly', { time: timeStr });
    default: return t('webReportsCronDailyFallback', { time: timeStr });
  }
}

function cronToDescription(t: (key: string, params?: Record<string, string | number>) => string, cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [m, h, dom, mon, dow] = parts;
  const timeStr = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;

  if (dow !== '*') {
    const dowKey = DAYS_OF_WEEK.find(d => d.value === dow)?.key ?? 'webReportsDayMonday';
    return t('webReportsCronWeekly', { day: t(dowKey), time: timeStr });
  }
  if (dom !== '*') {
    return t('webReportsCronMonthly', { day: dom, time: timeStr });
  }
  if (mon.includes('/3')) {
    return t('webReportsCronQuarterly', { time: timeStr });
  }
  return t('webReportsCronDaily', { time: timeStr });
}

function parseCron(cron: string) {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return { freq: 'weekly' as Frequency, dayOfWeek: '1', dayOfMonth: '1', weekOfMonth: '1', time: '09:00' };
  }
  const [m, h, dom, mon, dow] = parts;
  const time = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  
  if (dow !== '*') {
    return { freq: 'weekly' as Frequency, dayOfWeek: dow, dayOfMonth: '1', weekOfMonth: '1', time };
  }
  if (dom !== '*') {
    return { freq: 'monthly' as Frequency, dayOfWeek: '1', dayOfMonth: dom, weekOfMonth: '1', time };
  }
  if (mon.includes('/3')) {
    return { freq: 'quarterly' as Frequency, dayOfWeek: '1', dayOfMonth: '1', weekOfMonth: '1', time };
  }
  return { freq: 'daily' as Frequency, dayOfWeek: '1', dayOfMonth: '1', weekOfMonth: '1', time };
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
  
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const { data: templates = [] } = useReportTemplates(crewId);
  const { data: schedules = [] } = useScheduledReports(crewId);
  const saveMutation = useSaveScheduledReport(crewId);
  const deleteMutation = useDeleteScheduledReport(crewId);

  const splitRecipients = (raw: string): string[] =>
    raw.split(',').map((email) => email.trim()).filter(Boolean);

  const handleCreateOrUpdate = () => {
    const cron = buildCron(frequency, dayOfWeek, dayOfMonth, weekOfMonth, time);
    saveMutation.mutate(
      {
        id: editingScheduleId || undefined,
        templateId,
        schedule: cron,
        format,
        recipients: splitRecipients(recipients),
        enabled: true,
      },
      {
        onSuccess: () => {
          showSuccess(editingScheduleId ? t('webReportsScheduledUpdated') : t('webReportsScheduledSaved'));
          resetForm();
        },
        onError: () => showError(t('webReportsScheduledSaveFailed')),
      },
    );
  };

  const resetForm = () => {
    setTemplateId('');
    setFrequency('weekly');
    setDayOfWeek('1');
    setDayOfMonth('1');
    setWeekOfMonth('1');
    setTime('09:00');
    setFormat('pdf');
    setRecipients('');
    setEditingScheduleId(null);
  };

  const handleLoadEdit = (s: ScheduledReport) => {
    setEditingScheduleId(s.id);
    setTemplateId(s.templateId);
    setFormat(s.format);
    setRecipients(s.recipients.join(', '));
    
    // Parse cron to restore frequency settings
    const parsed = parseCron(s.schedule);
    setFrequency(parsed.freq);
    setDayOfWeek(parsed.dayOfWeek);
    setDayOfMonth(parsed.dayOfMonth);
    setWeekOfMonth(parsed.weekOfMonth);
    setTime(parsed.time);
    
    showSuccess(t('webReportsScheduledEditing', { name: s.templateName }));
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
        onSuccess: () => {
          showSuccess(s.enabled ? t('webReportsScheduledPaused') : t('webReportsScheduledResumed'));
        },
        onError: () => showError(t('webReportsScheduledToggleFailed')),
      },
    );
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    if (!window.confirm(t('webReportsScheduledDeleteConfirm', { name }))) {
      return;
    }

    deleteMutation.mutate(id, {
      onSuccess: () => {
        showSuccess(t('webReportsScheduledDeleted', { name }));
        if (editingScheduleId === id) {
          resetForm();
        }
      },
      onError: () => showError(t('webReportsScheduledDeleteFailed', { name })),
    });
  };

  const canCreate =
    !!crewId && !!templateId && splitRecipients(recipients).length > 0;

  const showDayOfWeek = frequency === 'weekly' || frequency === 'quarterly';
  const showDayOfMonth = frequency === 'monthly';
  const showWeekOfMonth = frequency === 'quarterly';

  return (
    <TierGateGuard minTier="admiral" fallback={null}>
      <section className="space-y-sz-md border-t border-outline/20 pt-sz-lg">
        <div>
          <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsScheduledTitle')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsScheduledDesc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-sz-lg lg:grid-cols-3">
          {/* Schedules List Pane */}
          <div className="space-y-sz-sm lg:col-span-1">
            <h3 className="text-sm font-semibold text-on-surface">{t('webReportsScheduledActiveList')}</h3>
            {schedules.length > 0 ? (
              <ul className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                {schedules.map((s) => (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-2 rounded-lg border bg-surface p-4 transition-colors ${
                      s.enabled ? 'border-outline/40 hover:border-outline' : 'border-outline/20 opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {s.templateName}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.enabled
                            ? 'bg-success-container/30 text-on-success-container'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {s.enabled ? t('webReportsStatusActive') : t('webReportsStatusPaused')}
                        </span>
                      </div>
                      <span className="mt-1.5 block text-xs font-medium text-on-surface-variant">
                        {cronToDescription(t, s.schedule)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-on-surface-variant font-mono">
                        {s.format.toUpperCase()} · {t('webReportsScheduledRecipientCount', { count: s.recipients.length })}
                      </span>
                      {s.lastRanAt && (
                        <span className="mt-2 block text-[9px] text-on-surface-variant opacity-75 leading-relaxed">
                          {t('webReportsScheduledLastRan', { time: new Date(s.lastRanAt).toLocaleString() })}
                          {s.nextRunAt && <><br />{t('webReportsScheduledNextRun', { time: new Date(s.nextRunAt).toLocaleString() })}</>}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1 border-t border-outline/10 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleSchedule(s)}
                        disabled={saveMutation.isPending || isInLockout}
                        title={s.enabled ? t('webReportsScheduledPauseTitle') : t('webReportsScheduledResumeTitle')}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                          s.enabled
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            : 'bg-success/10 text-success hover:bg-success/20'
                        }`}
                      >
                        {s.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {s.enabled ? t('webReportsScheduledPause') : t('webReportsScheduledResume')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadEdit(s)}
                        title={t('webReportsScheduledEditTitle')}
                        className="inline-flex items-center gap-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface px-2.5 py-1.5 text-[10px] font-bold transition-colors"
                      >
                        <Edit2 className="h-3 w-3 text-on-surface-variant" />
                        {t('edit')}
                      </button>

                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeleteSchedule(s.id, s.templateName)}
                        title={t('webReportsScheduledDeleteTitle')}
                        className="inline-flex items-center gap-1 rounded-lg bg-error-container/20 text-error hover:bg-error-container/30 ms-auto px-2.5 py-1.5 text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t('delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-outline/40 p-8 text-center text-xs text-on-surface-variant">
                <p>{t('webReportsScheduledEmpty')}</p>
                <p className="mt-1">{t('webReportsScheduledEmptyDesc')}</p>
              </div>
            )}
          </div>

          {/* Form Pane */}
          <div className="lg:col-span-2 space-y-sz-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">
                {editingScheduleId ? t('webReportsScheduledEditTitle') : t('webReportsScheduledAdd')}
              </h3>
              {editingScheduleId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-error transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  {t('webReportsScheduledCancelEdit')}
                </button>
              )}
            </div>
            
            <div className="space-y-4 rounded-xl border border-outline/40 bg-surface-container/20 p-5">
              {/* Template */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledTemplateLabel')}</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={templates.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none disabled:opacity-50"
                >
                  <option value="">{templates.length === 0 ? t('webReportsScheduledNoTemplates') : t('webReportsScheduledSelectTemplate')}</option>
                  {templates.map((tmpl) => (<option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledFrequency')}</label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(['daily', 'weekly', 'monthly', 'quarterly'] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                        frequency === f
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface border border-outline/35 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {t(FREQ_LABEL_KEYS[f])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {showDayOfWeek && (
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledDayOfWeek')}</label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                    >
                      {DAYS_OF_WEEK.map((d) => (<option key={d.value} value={d.value}>{t(d.key)}</option>))}
                    </select>
                  </div>
                )}
                {showDayOfMonth && (
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledDayOfMonth')}</label>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                {showWeekOfMonth && (
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledWeekOfMonth')}</label>
                    <select
                      value={weekOfMonth}
                      onChange={(e) => setWeekOfMonth(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                    >
                      {WEEKS_OF_MONTH.map((w) => (<option key={w.value} value={w.value}>{t(w.key)}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledTime')}</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedule preview */}
              <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3.5 py-2.5 text-xs text-on-surface-variant border border-outline/20">
                <Clock className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                <span className="font-semibold text-on-surface">{t('webReportsScheduledSummaryLabel')}</span>
                <span className="font-mono">{describeCron(t, frequency, dayOfWeek, dayOfMonth, weekOfMonth, time)}</span>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledFormatLabel')}</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                  className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                >
                  <option value="pdf">{t('webReportsScheduledFormatPdf')}</option>
                  <option value="csv">{t('webReportsScheduledFormatCsv')}</option>
                </select>
              </div>

              {/* Recipients */}
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsScheduledRecipientsLabel')}</label>
                <input
                  type="text"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder={t('webReportsScheduledRecipientsPlaceholder')}
                  className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateOrUpdate}
                disabled={!canCreate || isInLockout || saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {saveMutation.isPending
                  ? t('webReportsScheduledSaving')
                  : editingScheduleId
                    ? t('webReportsScheduledUpdate')
                    : t('webReportsScheduledAdd')
                }
              </button>
            </div>
          </div>
        </div>
      </section>
    </TierGateGuard>
  );
}
