// src/components/settings/FleetPolicyTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Moon, Clock } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { speedUnit, mphToDisplaySpeed, displaySpeedToMph } from '@/lib/units';
import { useFleetPolicy, useSaveFleetPolicy } from '@/hooks/queries/useFleetPolicy';
import { useSnackbar } from '@/components/shared/Snackbar';
import { FLEET_POLICY_DEFAULTS } from '@/types/tier';
import type { FleetPolicy } from '@/types/tier';

export function FleetPolicyTab() {
  const { t } = useT();
  const { crewId } = useCrew();
  const { system } = useMeasurementSystem();
  const { showSuccess, showError } = useSnackbar();

  const { data: policy, isLoading } = useFleetPolicy(crewId);
  const saveMutation = useSaveFleetPolicy(crewId);

  const current = policy ?? FLEET_POLICY_DEFAULTS;

  const [fatigueLimit, setFatigueLimit] = useState(current.fatigue_limit_hours);
  const [extremeSpeed, setExtremeSpeed] = useState(() => mphToDisplaySpeed(current.extreme_speed_mph, system));
  const [phonePolicy, setPhonePolicy] = useState<string>(current.phone_policy);
  const [scoringMode, setScoringMode] = useState<string>(current.scoring_mode);
  const [retentionDays, setRetentionDays] = useState(current.audit_retention_days);
  const [curfewEnabled, setCurfewEnabled] = useState(Boolean(current.curfew_enabled));
  const [curfewStart, setCurfewStart] = useState(current.curfew_start || '22:00');
  const [curfewEnd, setCurfewEnd] = useState(current.curfew_end || '06:00');
  const [inactivityAlertEnabled, setInactivityAlertEnabled] = useState(Boolean(current.inactivity_alert_enabled));
  const [inactivityThresholdMin, setInactivityThresholdMin] = useState(current.inactivity_threshold_min || 30);

  useEffect(() => {
    if (policy) {
      setFatigueLimit(policy.fatigue_limit_hours);
      setExtremeSpeed(mphToDisplaySpeed(policy.extreme_speed_mph, system));
      setPhonePolicy(policy.phone_policy);
      setScoringMode(policy.scoring_mode);
      setRetentionDays(policy.audit_retention_days);
      setCurfewEnabled(Boolean(policy.curfew_enabled));
      setCurfewStart(policy.curfew_start || '22:00');
      setCurfewEnd(policy.curfew_end || '06:00');
      setInactivityAlertEnabled(Boolean(policy.inactivity_alert_enabled));
      setInactivityThresholdMin(policy.inactivity_threshold_min || 30);
    }
  }, [policy, system]);

  const handleSave = () => {
    const extremeSpeedMph = displaySpeedToMph(extremeSpeed, system);
    saveMutation.mutate(
      {
        fatigue_limit_hours: fatigueLimit,
        extreme_speed_mph: extremeSpeedMph,
        phone_policy: phonePolicy as FleetPolicy['phone_policy'],
        scoring_mode: scoringMode as FleetPolicy['scoring_mode'],
        audit_retention_days: retentionDays,
        curfew_enabled: curfewEnabled,
        curfew_start: curfewStart,
        curfew_end: curfewEnd,
        inactivity_alert_enabled: inactivityAlertEnabled,
        inactivity_threshold_min: inactivityThresholdMin,
      },
      {
        onSuccess: () => showSuccess(t('webFleetPolicySaved')),
        onError: () => showError(t('webFleetPolicySaveFailed')),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-sz-lg animate-pulse">
        <div className="h-8 w-48 bg-surface-container rounded" />
        <div className="h-10 w-full bg-surface-container rounded" />
        <div className="h-10 w-full bg-surface-container rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-sz-lg">
      <div>
        <h2 className="text-sm font-bold text-on-surface">{t('webFleetPolicyTitle')}</h2>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webFleetPolicyDesc')}</p>
      </div>

      {/* Extreme Speed Threshold */}
      <div>
        <label htmlFor="fleet-speed" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyExtremeSpeed')} ({speedUnit(system)})
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="fleet-speed"
            type="number"
            min={system === 'metric' ? 30 : 20}
            max={system === 'metric' ? 240 : 150}
            value={extremeSpeed}
            onChange={(e) => setExtremeSpeed(Number(e.target.value))}
            className="w-24 rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
          />
          <span className="text-sm text-on-surface-variant">{speedUnit(system)}</span>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webFleetPolicyExtremeSpeedHint')}</p>
      </div>

      {/* Fatigue Limit */}
      <div>
        <label htmlFor="fleet-fatigue" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyFatigueLimit')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="fleet-fatigue"
            type="number"
            min={1}
            max={24}
            value={fatigueLimit}
            onChange={(e) => setFatigueLimit(Number(e.target.value))}
            className="w-24 rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
          />
          <span className="text-sm text-on-surface-variant">{t('webFleetPolicyHours')}</span>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webFleetPolicyFatigueHint')}</p>
      </div>

      {/* Phone Policy */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyPhonePolicy')}
        </label>
        <div className="mt-1 flex gap-2">
          {(['warn', 'penalize'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPhonePolicy(opt)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
                phonePolicy === opt
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t(opt === 'warn' ? 'webFleetPolicyWarn' : 'webFleetPolicyPenalize')}
            </button>
          ))}
        </div>
      </div>

      {/* Scoring Mode */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyScoringMode')}
        </label>
        <div className="mt-1 flex gap-2">
          {(['consumer', 'enterprise'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setScoringMode(opt)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
                scoringMode === opt
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t(opt === 'consumer' ? 'webFleetPolicyConsumer' : 'webFleetPolicyEnterprise')}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webFleetPolicyScoringModeHint')}</p>
      </div>

      {/* Audit Retention */}
      <div>
        <label htmlFor="fleet-retention" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyAuditRetention')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <select
            id="fleet-retention"
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
          >
            <option value={30}>30 {t('webFleetPolicyDays')}</option>
            <option value={90}>90 {t('webFleetPolicyDays')}</option>
            <option value={180}>180 {t('webFleetPolicyDays')}</option>
            <option value={365}>365 {t('webFleetPolicyDays')}</option>
          </select>
        </div>
      </div>

      {/* Curfew Driving Hours */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyCurfewTitle')}
        </label>
        <p className="mt-0.5 text-xs text-on-surface-variant">{t('webFleetPolicyCurfewDesc')}</p>
        <div className="mt-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={curfewEnabled}
              onChange={(e) => setCurfewEnabled(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <span className="text-xs font-medium text-on-surface">
              {t('webFleetPolicyCurfewEnable')}
            </span>
          </label>
          {curfewEnabled && (
            <div className="flex flex-wrap items-center gap-4 pl-6 pt-1">
              <div>
                <label htmlFor="fleet-curfew-start" className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  {t('webFleetPolicyCurfewStart')}
                </label>
                <input
                  id="fleet-curfew-start"
                  type="time"
                  value={curfewStart}
                  onChange={(e) => setCurfewStart(e.target.value)}
                  className="rounded-lg border border-outline bg-surface px-3 py-1.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="fleet-curfew-end" className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  {t('webFleetPolicyCurfewEnd')}
                </label>
                <input
                  id="fleet-curfew-end"
                  type="time"
                  value={curfewEnd}
                  onChange={(e) => setCurfewEnd(e.target.value)}
                  className="rounded-lg border border-outline bg-surface px-3 py-1.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Driver Inactivity Alerts */}
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webFleetPolicyInactivityTitle')}
        </label>
        <p className="mt-0.5 text-xs text-on-surface-variant">{t('webFleetPolicyInactivityDesc')}</p>
        <div className="mt-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inactivityAlertEnabled}
              onChange={(e) => setInactivityAlertEnabled(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <span className="text-xs font-medium text-on-surface">
              {t('webFleetPolicyInactivityEnable')}
            </span>
          </label>
          {inactivityAlertEnabled && (
            <div className="pl-6 pt-1">
              <label htmlFor="fleet-inactivity" className="block text-[11px] font-medium text-on-surface-variant mb-1">
                {t('webFleetPolicyInactivityThreshold')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="fleet-inactivity"
                  type="number"
                  min={5}
                  max={480}
                  value={inactivityThresholdMin}
                  onChange={(e) => setInactivityThresholdMin(Number(e.target.value))}
                  className="w-24 rounded-lg border border-outline bg-surface px-4 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
                />
                <span className="text-sm text-on-surface-variant">{t('webFleetPolicyMinutes')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saveMutation.isPending ? t('saving') : t('webSave')}
      </button>
    </div>
  );
}
