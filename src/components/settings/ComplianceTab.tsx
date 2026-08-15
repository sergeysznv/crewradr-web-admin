'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useComplianceSettings, useSaveComplianceSettings } from '@/hooks/queries/useComplianceSettings';
import { useSnackbar } from '@/components/shared/Snackbar';

export function ComplianceTab() {
  const { t } = useT();
  const { crewId, role } = useCrew();
  const { showSuccess, showError } = useSnackbar();

  const { data: settings, isLoading } = useComplianceSettings(crewId);
  const saveMutation = useSaveComplianceSettings(crewId);

  // Local state for toggles and values
  const [dotOshaMode, setDotOshaMode] = useState(false);
  const [dotEld, setDotEld] = useState(false);
  const [dotDvir, setDotDvir] = useState(false);
  const [dotDrugTesting, setDotDrugTesting] = useState(false);

  const [gdprMode, setGdprMode] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [gdprRetentionDays, setGdprRetentionDays] = useState(30);
  const [gdprAnonymize, setGdprAnonymize] = useState(true);
  const [gdprBreach, setGdprBreach] = useState(false);

  const [dutyCycleMasking, setDutyCycleMasking] = useState(false);
  const [geofencingMasking, setGeofencingMasking] = useState(false);
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');

  useEffect(() => {
    if (settings) {
      setDotOshaMode(settings.dot_osha_mode);
      setDotEld(settings.dot_eld_enabled);
      setDotDvir(settings.dot_dvir_enabled);
      setDotDrugTesting(settings.dot_drug_testing_enabled);

      setGdprMode(settings.gdpr_enhanced_mode);
      setGdprConsent(settings.gdpr_consent_required);
      setGdprRetentionDays(settings.gdpr_retention_days);
      setGdprAnonymize(settings.gdpr_anonymize_exports);
      setGdprBreach(settings.gdpr_breach_notify);

      setDutyCycleMasking(settings.duty_cycle_masking_enabled);
      setGeofencingMasking(settings.geofencing_masking_enabled);
      setShiftStart(settings.shift_hours_start);
      setShiftEnd(settings.shift_hours_end);
    }
  }, [settings]);

  const handleSave = () => {
    saveMutation.mutate(
      {
        dot_osha_mode: dotOshaMode,
        dot_eld_enabled: dotEld,
        dot_dvir_enabled: dotDvir,
        dot_drug_testing_enabled: dotDrugTesting,
        gdpr_enhanced_mode: gdprMode,
        gdpr_consent_required: gdprConsent,
        gdpr_retention_days: gdprRetentionDays,
        gdpr_anonymize_exports: gdprAnonymize,
        gdpr_breach_notify: gdprBreach,
        duty_cycle_masking_enabled: dutyCycleMasking,
        geofencing_masking_enabled: geofencingMasking,
        shift_hours_start: shiftStart,
        shift_hours_end: shiftEnd,
      },
      {
        onSuccess: () => showSuccess(t('webSettingsComplianceSaved') || 'Compliance settings saved successfully.'),
        onError: () => showError(t('webSettingsComplianceFailed') || 'Failed to save compliance settings.'),
      }
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

  const isManager = role === 'captain' || role === 'co-captain' || role === 'co_captain';

  if (!isManager) {
    return (
      <div className="text-center py-12">
        <ShieldAlert className="mx-auto h-12 w-12 text-zinc-400" />
        <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Access Denied</h3>
        <p className="mt-1 text-xs text-zinc-500">Only captains and co-captains can manage compliance settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold text-on-surface">{t('webComplianceTitle') || 'Compliance Settings'}</h2>
        <p className="mt-1 text-xs text-on-surface-variant">Configure regulatory tracking policies, privacy masking, and HOS rules.</p>
      </div>

      {/* Duty-Cycle Masking Group */}
      <div className="border border-outline rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-on-surface tracking-wide uppercase">
            {t('dutyCycleMaskingTitle') || 'Duty-Cycle Masking'}
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t('dutyCycleExplain') || 'Protect employee privacy during off-hours. Location tracking is automatically masked outside of shift hours or when leaving designated geofenced zones.'}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dutyCycleMasking}
              onChange={(e) => setDutyCycleMasking(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <div>
              <span className="text-xs font-semibold text-on-surface">
                {t('enableDutyCycleMasking') || 'Enable Duty-Cycle Masking'}
              </span>
              <p className="text-[10px] text-on-surface-variant">Limit location tracking and reporting to work shift hours only.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={geofencingMasking}
              onChange={(e) => setGeofencingMasking(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <div>
              <span className="text-xs font-semibold text-on-surface">
                {t('enableGeofencingMasking') || 'Enable Geofencing Masking'}
              </span>
              <p className="text-[10px] text-on-surface-variant">
                {t('enableGeofencingMaskingDesc') || 'Mask location tracking when outside designated geofenced work zones during duty cycle.'}
              </p>
            </div>
          </label>

          {dutyCycleMasking && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">
                  {t('shiftHoursStart') || 'Shift Start'}
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-3 py-1.5 text-xs text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">
                  {t('shiftHoursEnd') || 'Shift End'}
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline bg-surface px-3 py-1.5 text-xs text-on-surface focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOT/OSHA Group */}
      <div className="border border-outline rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-on-surface tracking-wide uppercase">
            {t('complianceDotOshaMaster') || 'DOT/OSHA Compliance'}
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t('complianceDotOshaDesc') || 'Enable FMCSA-compliant HOS tracking, vehicle inspections, and drug testing for regulated drivers.'}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dotOshaMode}
              onChange={(e) => setDotOshaMode(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <div>
              <span className="text-xs font-semibold text-on-surface">
                {t('enableDotOshaMode') || 'Enable DOT/OSHA Compliance Mode'}
              </span>
              <p className="text-[10px] text-on-surface-variant">
                {t('enableDotOshaModeDesc') || 'Master toggle for FMCSA and OSHA compliance workflows.'}
              </p>
            </div>
          </label>

          {dotOshaMode && (
            <div className="pl-6 space-y-3 pt-2 border-t border-outline-variant">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dotEld}
                  onChange={(e) => setDotEld(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceDotEld') || 'ELD / Hours of Service'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Record and audit Hours of Service (HOS) logs for drivers.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dotDvir}
                  onChange={(e) => setDotDvir(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceDotDvir') || 'Vehicle Inspections (DVIR)'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Require pre-trip and post-trip vehicle inspection checklists.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dotDrugTesting}
                  onChange={(e) => setDotDrugTesting(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceDotDrugTesting') || 'Drug & Alcohol Testing'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Integrate substance testing tracking and alerts.</p>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* GDPR/Privacy Group */}
      <div className="border border-outline rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-on-surface tracking-wide uppercase">
            {t('complianceGdprMaster') || 'Enhanced Privacy (GDPR)'}
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t('complianceGdprDesc') || 'Configure GDPR compliance tools, including mandatory consent and data retention bounds.'}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={gdprMode}
              onChange={(e) => setGdprMode(e.target.checked)}
              className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
            />
            <div>
              <span className="text-xs font-semibold text-on-surface">
                {t('enableGdprMode') || 'Enable GDPR Enhanced Privacy Mode'}
              </span>
              <p className="text-[10px] text-on-surface-variant">
                {t('enableGdprModeDesc') || 'Master toggle for EU General Data Protection Regulation privacy tools.'}
              </p>
            </div>
          </label>

          {gdprMode && (
            <div className="pl-6 space-y-3 pt-2 border-t border-outline-variant">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceGdprConsent') || 'Mandatory Consent Flow'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Prompt crew members for tracking consent during onboarding.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprAnonymize}
                  onChange={(e) => setGdprAnonymize(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceGdprAnonymize') || 'Anonymize Data Exports'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Mask identifying parameters in shared data downloads.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprBreach}
                  onChange={(e) => setGdprBreach(e.target.checked)}
                  className="mt-0.5 rounded border-outline text-primary focus:ring-primary/30"
                />
                <div>
                  <span className="text-xs font-semibold text-on-surface">
                    {t('complianceGdprBreach') || 'Breach Notification'}
                  </span>
                  <p className="text-[10px] text-on-surface-variant">Send notification alerts if security vulnerability incidents are logged.</p>
                </div>
              </label>

              <div className="pt-2 border-t border-outline-variant">
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase">
                  {t('complianceGdprRetention') || 'Data Retention (days)'}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={gdprRetentionDays}
                    onChange={(e) => setGdprRetentionDays(Number(e.target.value))}
                    className="rounded-lg border border-outline bg-surface px-4 py-2 text-xs text-on-surface focus:border-primary/50 focus:outline-none"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>365 days</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saveMutation.isPending ? t('saving') : t('webSave') || 'Save'}
      </button>
    </div>
  );
}
