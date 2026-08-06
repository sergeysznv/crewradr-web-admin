// src/components/settings/GeneralTab.tsx
'use client';

import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { tierLabel, tierColor } from '@/lib/utils';
import type { CrewSettings } from '@/types/rpc';

export function GeneralTab({
  subscription,
}: {
  subscription: CrewSettings['subscription'];
}) {
  const { t } = useT();
  const { crewName, tier } = useCrew();

  return (
    <div className="space-y-lg">
      <div>
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {t('webSettingsCrewName')}
        </label>
        <input
          defaultValue={crewName}
          readOnly
          className="mt-1 w-full px-4 py-2 rounded-lg border border-outline bg-surface-container text-sm text-on-surface cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          {t('webSettingsCrewNameHint')}
        </p>
      </div>

      <div className="flex items-center justify-between bg-surface-container rounded-lg p-lg">
        <div>
          <div className="text-sm font-semibold text-on-surface">{t('webSettingsSubscriptionTier')}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{t('webSettingsCurrentPlan')}</div>
        </div>
        <span
          className="px-3 py-1 rounded-xl text-xs font-bold"
          style={{ backgroundColor: `${tierColor(tier)}20`, color: tierColor(tier) }}
        >
          {tierLabel(tier)}
        </span>
      </div>

      {subscription && (
        <div className="bg-surface-container rounded-lg p-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">{t('webSettingsStatus')}</span>
            <span className="text-sm font-semibold text-on-surface capitalize">
              {subscription.status}
            </span>
          </div>
          {subscription.billing_interval && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">{t('webSettingsBilling')}</span>
              <span className="text-sm font-semibold text-on-surface capitalize">
                {subscription.billing_interval}
              </span>
            </div>
          )}
          {subscription.max_capacity > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">{t('webSettingsMaxMembers')}</span>
              <span className="text-sm font-semibold text-on-surface">
                {subscription.max_capacity}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-container rounded-lg p-lg">
        <div className="text-sm font-semibold text-on-surface">{t('webSettingsBilling')}</div>
        <div className="text-xs text-on-surface-variant mt-0.5">
          {t('webSettingsBillingHint')}
        </div>
      </div>
    </div>
  );
}
