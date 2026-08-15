// src/components/reports/ReportBuilder.tsx
'use client';

import { useState } from 'react';
import { BarChart3, Gauge, GripVertical, Loader2, Table2, Trash2, Edit2, XCircle, Plus } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useReportTemplates, useSaveReportTemplate, useDeleteReportTemplate } from '@/hooks/queries/useReportTemplates';
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
  const { settings, isInLockout } = useTier();
  const { showSuccess, showError } = useSnackbar();
  const crewId = settings?.crewId ?? '';

  const [templateName, setTemplateName] = useState('');
  const [widgets, setWidgets] = useState<ReportWidget[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { data: templates = [] } = useReportTemplates(crewId || null);
  const saveMutation = useSaveReportTemplate(crewId || null);
  const deleteMutation = useDeleteReportTemplate(crewId || null);

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

  const loadTemplateForEdit = (template: ReportTemplate) => {
    setTemplateName(template.name);
    setWidgets(template.widgets);
    setEditingTemplateId(template.id);
    showSuccess(t('webReportsBuilderLoaded', { name: template.name }));
  };

  const handleCancelEdit = () => {
    setTemplateName('');
    setWidgets([]);
    setEditingTemplateId(null);
  };

  const handleDeleteTemplate = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Prevent loading template on click
    if (!window.confirm(t('webReportsBuilderDeleteConfirm', { name }))) {
      return;
    }

    deleteMutation.mutate(id, {
      onSuccess: () => {
        showSuccess(t('webReportsBuilderDeleted', { name }));
        if (editingTemplateId === id) {
          handleCancelEdit();
        }
      },
      onError: () => showError(t('webReportsBuilderDeleteFailed', { name })),
    });
  };

  const handleSave = () => {
    saveMutation.mutate(
      { 
        id: editingTemplateId || undefined,
        name: templateName.trim(), 
        widgets 
      },
      {
        onSuccess: () => {
          showSuccess(editingTemplateId ? t('webReportsBuilderUpdated') : t('webReportsBuilderSaved'));
          setTemplateName('');
          setWidgets([]);
          setEditingTemplateId(null);
        },
        onError: () => showError(t('webReportsBuilderSaveFailed')),
      },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-sz-lg lg:grid-cols-3">
      {/* Builder pane */}
      <div className="space-y-sz-md rounded-xl border border-outline/40 bg-surface-container/20 p-sz-lg lg:col-span-2">
        <div className="flex items-center justify-between border-b border-outline/20 pb-sz-sm">
          <h3 className="text-base font-bold text-on-surface">
            {editingTemplateId ? t('webReportsBuilderEditTitle') : t('webReportsBuilderCreateTitle')}
          </h3>
          {editingTemplateId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-error transition-colors"
            >
              <XCircle className="h-4 w-4" />
              {t('webReportsBuilderCancelEdit')}
            </button>
          )}
        </div>

        {/* Template name */}
        <div>
          <label htmlFor="report-template-name" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            {t('webReportsBuilderNameLabel')}
          </label>
          <input
            id="report-template-name"
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={t('webReportsBuilderNamePlaceholder')}
            className="mt-1.5 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:outline-none"
          />
        </div>

        {/* Widget palette */}
        <div>
          <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsBuilderAddWidget')}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {WIDGET_TYPES.map((wt) => {
              const Icon = wt.icon;
              return (
                <button
                  key={wt.type}
                  type="button"
                  onClick={() => addWidget(wt.type)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface transition-all hover:border-primary hover:bg-surface-container"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <Icon className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                  {t(wt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Widgets (drag to reorder) */}
        {widgets.length > 0 ? (
          <div className="space-y-2 border-t border-outline/10 pt-sz-md">
            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webReportsBuilderContents')}</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
                    className={`flex items-center gap-3 rounded-lg border bg-surface p-3 transition-colors ${
                      dragIndex === i ? 'opacity-40' : ''
                    } ${isDragTarget ? 'border-primary bg-primary-container/10' : 'border-outline/40 hover:border-outline'}`}
                  >
                    <span className="cursor-grab text-on-surface-variant hover:text-on-surface transition-colors" aria-hidden="true">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface">
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
                        className="ms-2 rounded-lg border border-outline/50 bg-surface px-2.5 py-1 text-xs text-on-surface focus:border-primary/50 focus:outline-none"
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
                      className="ms-auto rounded-lg p-1 text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-outline/40 p-8 text-center text-xs text-on-surface-variant">
            {t('webReportsBuilderNoWidgets')}
          </div>
        )}

        {/* Save */}
        <div className="border-t border-outline/20 pt-sz-md">
          <button
            type="button"
            onClick={handleSave}
            disabled={!templateName.trim() || widgets.length === 0 || !crewId || saveMutation.isPending || isInLockout}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saveMutation.isPending
              ? t('webReportsBuilderSaving')
              : editingTemplateId
                ? t('webReportsBuilderUpdate')
                : t('webReportsBuilderSaveTemplate')
            }
          </button>
        </div>
      </div>

      {/* Templates list pane */}
      <div className="space-y-sz-md rounded-xl border border-outline/40 bg-surface-container/20 p-sz-lg lg:col-span-1">
        <h3 className="text-base font-bold text-on-surface">{t('webReportsBuilderSavedTemplates')}</h3>
        
        {templates.length > 0 ? (
          <ul className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
            {templates.map((template) => (
              <li key={template.id}>
                <div
                  className={`group flex items-center justify-between rounded-lg border bg-surface px-4 py-3 transition-colors ${
                    editingTemplateId === template.id
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline/40 hover:border-outline'
                  }`}
                >
                  <div className="min-w-0 pe-2">
                    <span className="block truncate text-sm font-semibold text-on-surface">{template.name}</span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                      {t('webReportsBuilderWidgetsCount', { count: template.widgets.length })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadTemplateForEdit(template)}
                      aria-label={t('webReportsBuilderEditAria')}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={(e) => handleDeleteTemplate(e, template.id, template.name)}
                      aria-label={t('webReportsBuilderDeleteAria')}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error transition-colors disabled:opacity-50"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === template.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center text-xs text-on-surface-variant">
            {t('webReportsBuilderNoTemplates')}
          </div>
        )}
      </div>
    </div>
  );
}
