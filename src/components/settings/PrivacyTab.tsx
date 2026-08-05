// src/components/settings/PrivacyTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useAuth } from '@/hooks/use-auth';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import {
  getPrivacySettings,
  getPersonalExport,
  deleteWebAccount,
  updateRetentionDays,
} from '@/lib/rpc';
import { effectiveHistoryDays } from '@/lib/privacy';
import { tierHistoryDays } from '@/lib/tier';
import type { CrewTier } from '@/types/tier';
import type { PersonalExport } from '@/types/rpc';
import { Download, Loader2 } from 'lucide-react';

// Backend tier strings are snake_case ('first_mate'); the tier helpers use
// camelCase CrewTier keys.
function toCrewTier(tier: string): CrewTier {
  return tier === 'first_mate' ? 'firstMate' : (tier as CrewTier);
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * The export RPC returns one JSONB payload regardless of format; produce a
 * real CSV (one section per data group) so the .csv download is valid.
 */
function toCsv(data: PersonalExport): string {
  const lines: string[] = [];
  const sections = [
    ['profile', data.profile],
    ['trips', data.trips],
    ['checkIns', data.checkIns],
  ] as const;
  for (const [name, rows] of sections) {
    if (!rows || rows.length === 0) continue;
    lines.push(`# ${name}`);
    const keys = Object.keys(rows[0]);
    lines.push(keys.map(csvEscape).join(','));
    for (const row of rows) {
      lines.push(keys.map((k) => csvEscape(String(row[k] ?? ''))).join(','));
    }
  }
  return lines.join('\n');
}

export function PrivacyTab() {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const { user, signOut } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showSuccess, showError } = useSnackbar();

  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [retentionDraft, setRetentionDraft] = useState<number | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tierKey = toCrewTier(tier);

  // Retention policy + sharing state (captain/co-captain gated server-side)
  const privacyQuery = useQuery({
    queryKey: ['privacySettings', crewId],
    queryFn: () => getPrivacySettings(supabase, crewId!),
    enabled: !!crewId,
    retry: false,
  });

  // Seed the retention slider once the policy loads
  useEffect(() => {
    if (privacyQuery.data && retentionDraft === null) {
      setRetentionDraft(privacyQuery.data.retentionDays);
    }
  }, [privacyQuery.data, retentionDraft]);

  const retentionDenied =
    !privacyQuery.isLoading && !privacyQuery.isSuccess &&
    privacyQuery.error?.message?.includes('Only captains');

  async function handlePersonalExport(format: 'json' | 'csv') {
    setExporting(format);
    try {
      const data = await getPersonalExport(supabase, format);
      const content = format === 'csv' ? toCsv(data) : JSON.stringify(data, null, 2);
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crewradr-personal-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess(t('webPrivacyExportDone'));
    } catch (e) {
      console.error('Export failed:', e);
      showError(t('webPrivacyExportFailed'));
    } finally {
      setExporting(null);
    }
  }

  async function handleSaveRetention() {
    if (!crewId || retentionDraft === null) return;
    setSavingRetention(true);
    try {
      await updateRetentionDays(supabase, crewId, retentionDraft);
      showSuccess(t('webPrivacyRetentionSaved'));
      queryClient.invalidateQueries({ queryKey: ['privacySettings', crewId] });
    } catch {
      showError(t('webPrivacyRetentionFailed'));
    } finally {
      setSavingRetention(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      if (!user?.email) {
        throw new Error('No authenticated user email available for account deletion.');
      }
      await deleteWebAccount(supabase);
      // Complete GDPR Art. 17 erasure: delete_web_account deliberately leaves
      // auth.users intact; the delete_account Edge Function (service role)
      // performs the final auth-level deletion, which cascades to the app
      // user row. Runs before the client-side purge so sign-out only happens
      // after full erasure.
      const { error: fnError } = await supabase.functions.invoke('delete_account', {
        body: { email: user.email },
      });
      if (fnError) throw fnError;
      // Client-side purge (GDPR Art. 17): wipe local storage, drop all
      // TanStack Query caches, clear the Supabase session, redirect.
      localStorage.clear();
      queryClient.clear();
      await signOut();
      router.push('/');
    } catch (e) {
      console.error('Delete account failed:', e);
      showError(t('webSettingsDeleteAccountFailed'));
      setDeleting(false);
      setShowDelete(false);
    }
  }

  const policy = privacyQuery.data;

  return (
    <div className="space-y-4">
      {/* ── Personal Data Export — always available (GDPR Art. 20) ── */}
      <div className="border border-outline rounded-lg p-lg">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
          <h3 className="font-heading font-bold text-sm text-on-surface">{t('webPrivacyExportTitle')}</h3>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webPrivacyExportHint')}</p>
        <p className="mt-1 text-[10px] text-on-surface-variant/60">{t('webPrivacyExportRateLimit')}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handlePersonalExport('json')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting === 'json' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('webPrivacyExportJson')}
          </button>
          <button
            onClick={() => handlePersonalExport('csv')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting === 'csv' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('webPrivacyExportCsv')}
          </button>
        </div>
      </div>

      {/* ── Data Retention — Captain+ ── */}
      <TierGateGuard minTier="captain" fallback={null}>
        <div className="border border-outline rounded-lg p-lg">
          <h3 className="font-heading font-bold text-sm text-on-surface">{t('webPrivacyRetentionTitle')}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webPrivacyRetentionHint')}</p>

          {privacyQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
            </div>
          ) : retentionDenied ? (
            <p className="mt-3 text-xs text-on-surface-variant">{t('webPrivacyRetentionDenied')}</p>
          ) : policy ? (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-surface-container rounded-lg p-3">
                  <div className="text-on-surface-variant">{t('webPrivacyRetentionTierDefault')}</div>
                  <div className="mt-0.5 text-sm font-bold text-on-surface">{t('webPrivacyRetentionDays', { days: tierHistoryDays(tierKey) })}</div>
                </div>
                <div className="bg-surface-container rounded-lg p-3">
                  <div className="text-on-surface-variant">{t('webPrivacyRetentionConfigured')}</div>
                  <div className="mt-0.5 text-sm font-bold text-on-surface">{t('webPrivacyRetentionDays', { days: policy.retentionDays })}</div>
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="text-primary/80">{t('webPrivacyRetentionEffective')}</div>
                  <div className="mt-0.5 text-sm font-bold text-primary">{t('webPrivacyRetentionDays', { days: effectiveHistoryDays(tierKey, policy.retentionDays) })}</div>
                </div>
              </div>

              <div>
                <input
                  type="range"
                  min={1}
                  max={365}
                  step={1}
                  value={retentionDraft ?? policy.retentionDays}
                  onChange={(e) => setRetentionDraft(Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label={t('webPrivacyRetentionTitle')}
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant/60">
                  <span>1 {t('webPrivacyRetentionDayUnit')}</span>
                  <span>365 {t('webPrivacyRetentionDayUnit')}</span>
                </div>
              </div>

              <button
                onClick={handleSaveRetention}
                disabled={savingRetention || retentionDraft === policy.retentionDays}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingRetention && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('webPrivacyRetentionSave')}
              </button>
            </div>
          ) : null}
        </div>
      </TierGateGuard>

      {/* ── Delete Account — always available (GDPR Art. 17) ── */}
      <div className="border border-error/20 rounded-lg p-lg bg-error/5">
        <h3 className="font-heading font-bold text-sm text-error">{t('webSettingsDeleteAccount')}</h3>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webSettingsDeleteAccountHint')}</p>
        <button
          onClick={() => setShowDelete(true)}
          disabled={!user}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('webSettingsDeleteAccountButton')}
        </button>
      </div>

      <ConfirmDialog
        open={showDelete}
        title={t('webSettingsDeleteAccount')}
        message={t('webSettingsDeleteAccountDialog')}
        confirmLabel={deleting ? t('webSettingsDeletingAccount') : t('webSettingsDeleteAccountButton')}
        destructive
        pending={deleting}
        verifyText={{
          match: 'DELETE',
          placeholder: 'DELETE',
          label: t('webSettingsDeleteAccountConfirm'),
        }}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
