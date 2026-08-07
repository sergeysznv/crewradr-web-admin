// src/components/settings/FleetPolicyTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useFleetPolicy, useSaveFleetPolicy } from '@/hooks/queries/useFleetPolicy';
import { useSnackbar } from '@/components/shared/Snackbar';
import { FLEET_POLICY_DEFAULTS } from '@/types/tier';
import type { FleetPolicy } from '@/types/tier';

export function FleetPolicyTab() {
  const { t } = useT();
  const { crewId } = useCrew();
  const { showSuccess, showError } = useSnackbar();

  const { data: policy, isLoading } = useFleetPolicy(crewId);
  const saveMutation = useSaveFleetPolicy(crewId);

  const current = policy ?? FLEET_POLICY_DEFAULTS;

  const [fatigueLimit, setFatigueLimit] = useState(current.fatigue_limit_hours);
  const [extremeSpeed, setExtremeSpeed] = useState(current.extreme_speed_mph);
  const [phonePolicy, setPhonePolicy] = useState<string>(current.phone_policy);
  const [scoringMode, setScoringMode] = useState<string>(current.scoring_mode);
  const [retentionDays, setRetentionDays] = useState(current.audit_retention_days);

  useEffect(() => {
    if (policy) {
      setFatigueLimit(policy.fatigue_limit_hours);
      setExtremeSpeed(policy.extreme_speed_mph);
      setPhonePolicy(policy.phone_policy);
      setScoringMode(policy.scoring_mode);
      setRetentionDays(policy.audit_retention_days);
    }
  }, [policy]);

  const handleSave = () => {
    saveMutation.mutate(
      {
        fatigue_limit_hours: fatigueLimit,
        extreme_speed_mph: extremeSpeed,
        phone_policy: phonePolicy as FleetPolicy['phone_policy'],
        scoring_mode: scoringMode as FleetPolicy['scoring_mode'],
        audit_retention_days: retentionDays,
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
          {t('webFleetPolicyExtremeSpeed')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="fleet-speed"
            type="number"
            min={20}
            max={150}
            value={extremeSpeed}
            onChange={(e) => setExtremeSpeed(Number(e.target.value))}
            className="w-24 rounded-lg border border-outline bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
          />
          <span className="text-sm text-on-surface-variant">{t('webFleetPolicyMph')}</span>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant/70">{t('webFleetPolicyExtremeSpeedHint')}</p>
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
        <p className="mt-1 text-xs text-on-surface-variant/70">{t('webFleetPolicyFatigueHint')}</p>
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
        <p className="mt-1 text-xs text-on-surface-variant/70">{t('webFleetPolicyScoringModeHint')}</p>
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

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saveMutation.isPending ? t('saving') : t('webSave')}
      </button>
    </div>
  );
}
