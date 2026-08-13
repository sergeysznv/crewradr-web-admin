// src/components/reports/ReportBuilder.tsx
'use client';

import { useState } from 'react';
import { BarChart3, Gauge, GripVertical, Loader2, Table2, Trash2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useReportTemplates, useSaveReportTemplate } from '@/hooks/queries/useReportTemplates';
import { useSnackbar } from '@/components/shared/Snackbar';
import type { ReportTemplate, ReportWidget } from '@/types/tier';

const WIDGET_TYPES: { type: ReportWidget['type']; labelKey: string; icon: typeof Gauge }[] = [
  { type: 'metric', labelKey: 'webReportsBuilderMetricLabel', icon: Gauge },
  { type: 'chart', labelKey: 'webReportsBuilderChartLabel', icon: BarChart3 },
  { type: 'table', labelKey: 'webReportsBuilderTableLabel', icon: Table2 },
];

const AVAILABLE_METRICS: { id: string; labelKey: string }[] = [
  { id: 'miles', labelKey: 'webReportsMetricMiles' },
  { id: 'hours', labelKey: 'webReportsMetricHours' },
  { id: 'alerts', labelKey: 'webReportsMetricAlerts' },
  { id: 'score', labelKey: 'webReportsMetricScore' },
  { id: 'trips', labelKey: 'webReportsMetricTrips' },
];

export function ReportBuilder() {
  const { t } = useT();
  const { settings } = useTier();
  const { showSuccess, showError } = useSnackbar();
  const crewId = settings?.crewId ?? '';

  const [templateName, setTemplateName] = useState('');
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { data: templates = [] } = useReportTemplates(crewId || null);
  const saveMutation = useSaveReportTemplate(crewId || null);

  const addWidget = (type: ReportWidget['type']) => {
    setWidgets([...widgets, { type, metric: 'miles' }]);
  };

  const removeWidget = (index: number) => {
    setWidgets(widgets.filter((_, i) => i !== index));
  };

  const handleDrop = () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const updated = [...widgets];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(overIndex, 0, moved);
    setWidgets(updated);
    setDragIndex(null);
    setOverIndex(null);
  };

  const loadTemplate = (template: ReportTemplate) => {
    setTemplateName(template.name);
    setWidgets(template.widgets);
  };

  const handleSave = () => {
    saveMutation.mutate(
      { name: templateName.trim(), widgets },
      {
        onSuccess: () => {
          showSuccess(t('webReportsBuilderSaved'));
          setTemplateName('');
          setWidgets([]);
        },
        onError: () => showError(t('webReportsBuilderSaveFailed')),
      },
    );
  };

  return (
    <div className="space-y-sz-md">
      {/* Template name */}
      <div>
        <label htmlFor="report-template-name" className="text-sm font-semibold text-on-surface">
          {t('webReportsBuilderNameLabel')}
        </label>
        <input
          id="report-template-name"
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder={t('webReportsBuilderNamePlaceholder')}
          className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:outline-none"
        />
      </div>

      {/* Widget palette */}
      <div>
        <h3 className="text-sm font-semibold text-on-surface">{t('webReportsBuilderAddWidget')}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {WIDGET_TYPES.map((wt) => {
            const Icon = wt.icon;
            return (
              <button
                key={wt.type}
                type="button"
                onClick={() => addWidget(wt.type)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-surface px-4 py-2 text-sm text-on-surface transition-colors hover:border-primary/40"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {t(wt.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Widgets (drag to reorder) */}
      <div className="space-y-2">
        {widgets.map((widget, i) => {
          const WidgetIcon = WIDGET_TYPES.find((wt) => wt.type === widget.type)?.icon ?? Gauge;
          const isDragTarget = dragIndex !== null && overIndex === i && dragIndex !== i;
          return (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={handleDrop}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`flex items-center gap-3 rounded-lg border bg-surface p-3 ${
                dragIndex === i ? 'opacity-50' : ''
              } ${isDragTarget ? 'border-primary' : 'border-outline'}`}
            >
              <span className="cursor-grab text-on-surface-variant" aria-hidden="true">
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                <WidgetIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                {t(WIDGET_TYPES.find((wt) => wt.type === widget.type)?.labelKey ?? 'webReportsBuilderMetricLabel')}
              </span>
              {widget.type === 'metric' && (
                <select
                  aria-label={t('webReportsBuilderMetricLabel')}
                  value={widget.metric ?? 'miles'}
                  onChange={(e) => {
                    const updated = [...widgets];
                    updated[i] = { ...updated[i], metric: e.target.value };
                    setWidgets(updated);
                  }}
                  className="rounded-full border border-outline bg-surface px-3 py-1 text-xs text-on-surface focus:border-primary/50 focus:outline-none"
                >
                  {AVAILABLE_METRICS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {t(m.labelKey)}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => removeWidget(i)}
                aria-label={t('webReportsBuilderRemoveWidget')}
                className="ml-auto rounded p-1 text-on-surface-variant transition-colors hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!templateName.trim() || widgets.length === 0 || !crewId || saveMutation.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saveMutation.isPending ? t('webReportsBuilderSaving') : t('webReportsBuilderSaveTemplate')}
      </button>

      {/* Existing templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{t('webReportsBuilderSavedTemplates')}</h3>
          <ul className="mt-2 space-y-2">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => loadTemplate(template)}
                  className="flex w-full items-center justify-between rounded-lg border border-outline bg-surface px-4 py-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="text-sm text-on-surface">{template.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {t('webReportsBuilderWidgetsCount', { count: template.widgets.length })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
