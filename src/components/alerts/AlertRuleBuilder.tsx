// src/components/alerts/AlertRuleBuilder.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useCrew } from '@/hooks/useCrew';
import { useAlertRules, useSaveAlertRule } from '@/hooks/queries/useAlertRules';
import { useFleetPolicy } from '@/hooks/queries/useFleetPolicy';
import { useSnackbar } from '@/components/shared/Snackbar';
import { FLEET_POLICY_DEFAULTS } from '@/types/tier';

export function AlertRuleBuilder() {
  const { t } = useT();
  const { settings } = useTier();
  const { crewId } = useCrew();
  const { showSuccess, showError } = useSnackbar();
  const { data: fleetPolicy } = useFleetPolicy(crewId);

  const defaultSpeed = fleetPolicy?.extreme_speed_mph ?? FLEET_POLICY_DEFAULTS.extreme_speed_mph;

  const [name, setName] = useState('');
  const [speedMph, setSpeedMph] = useState<number>(defaultSpeed);
  const [durationMin, setDurationMin] = useState<number>(5);

  // Sync default speed when fleet policy loads or changes
  useEffect(() => {
    setSpeedMph(defaultSpeed);
  }, [defaultSpeed]);

  const { data: rules = [], isError } = useAlertRules(crewId);
  const saveMutation = useSaveAlertRule(crewId);

  const handleSave = () => {
    saveMutation.mutate(
      { name: name.trim(), conditions: { speedMph, durationMin }, enabled: true },
      {
        onSuccess: () => {
          showSuccess(t('webAlertsRulesSaved'));
          setName('');
        },
        onError: () => showError(t('webAlertsRulesSaveFailed')),
      },
    );
  };

  const toggleRule = (ruleId: string, enabled: boolean) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    saveMutation.mutate(
      { id: rule.id, name: rule.name, conditions: rule.conditions, enabled },
      {
        onError: () => showError(t('webAlertsRulesToggleFailed')),
      },
    );
  };

  return (
    <div className="space-y-sz-md">
      {isError && (
        <p className="text-xs text-error">{t('webErrorLoading')}</p>
      )}
      {/* Existing rules */}
      {rules.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{t('webAlertsRulesYourRules')}</h3>
          <ul className="mt-2 space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 ${
                  rule.enabled ? 'border-outline' : 'border-outline/60 opacity-70'
                }`}
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-on-surface">{rule.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {t('webAlertsRulesCondition', {
                      speed: rule.conditions.speedMph ?? 0,
                      duration: rule.conditions.durationMin ?? 0,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleRule(rule.id, !rule.enabled)}
                  disabled={saveMutation.isPending}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                    rule.enabled
                      ? 'bg-success-container text-on-success-container hover:bg-success/25'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-on-surface-variant/20'
                  }`}
                >
                  {rule.enabled ? t('webAlertsRulesActive') : t('webAlertsRulesPaused')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New rule form */}
      <div>
        <h3 className="text-sm font-semibold text-on-surface">{t('webAlertsRulesCreateRule')}</h3>
        <div className="mt-2 space-y-4 rounded-lg border border-outline bg-surface p-4">
          <div>
            <label htmlFor="alert-rule-name" className="text-sm font-semibold text-on-surface">
              {t('webAlertsRulesNameLabel')}
            </label>
            <input
              id="alert-rule-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('webAlertsRulesNamePlaceholder')}
              className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="alert-rule-speed" className="text-sm font-semibold text-on-surface">
                {t('webAlertsRulesSpeedLabel')}
              </label>
              <input
                id="alert-rule-speed"
                type="number"
                min={0}
                value={speedMph}
                onChange={(e) => setSpeedMph(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                {t('webAlertsRulesSpeedHint', { default: defaultSpeed })}
              </p>
            </div>
            <div>
              <label htmlFor="alert-rule-duration" className="text-sm font-semibold text-on-surface">
                {t('webAlertsRulesDurationLabel')}
              </label>
              <input
                id="alert-rule-duration"
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saveMutation.isPending ? t('webAlertsRulesSaving') : t('webAlertsRulesSave')}
          </button>
        </div>
      </div>

      {rules.length === 0 && (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center">
          <p className="text-sm font-medium text-on-surface-variant">{t('webAlertsRulesEmpty')}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webAlertsRulesEmptyDesc')}</p>
        </div>
      )}
    </div>
  );
}
