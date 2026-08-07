// src/components/settings/SettingsView.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useCrewSettings } from '@/hooks/queries/useCrewSettings';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { tierRank } from '@/lib/utils';
import { GeneralTab } from '@/components/settings/GeneralTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { PrivacyTab } from '@/components/settings/PrivacyTab';
import { DangerZone } from '@/components/settings/DangerZone';
import { FilterChips } from '@/components/shared/FilterChips';
import { Lock } from 'lucide-react';

// The SSO tab slot is reserved: it stays hidden until the backend returns
// `sso_enabled: true` in crew settings (CrewSettings.sso_enabled). Do not
// add an SSO tab here before that flag exists.
const TABS = [
  { value: 'general' as const, labelKey: 'webSettingsGeneralTab' },
  { value: 'branding' as const, labelKey: 'webSettingsBrandingTab' },
  { value: 'privacy' as const, labelKey: 'webSettingsPrivacyTab' },
  { value: 'danger' as const, labelKey: 'webSettingsDangerTab' },
];

type Tab = typeof TABS[number]['value'];

export function SettingsView() {
  const { t } = useT();
  const { crewId, tier } = useCrew();

  // Tier gate — captain+ (tier >= 2)
  if (tierRank(tier) < 2) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webCrewSettingsTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  const { data: settings } = useCrewSettings(crewId);
  const [tab, setTab] = useState<Tab>('general');

  // Realtime — refresh settings when branding changes.
  useRealtimeInvalidation(
    crewId,
    'settings-branding',
    [{ table: 'crew_branding', filter: `crew_id=eq.${crewId}` }],
    ['crewSettings', crewId!],
  );

  return (
    <div className="max-w-3xl space-y-sz-lg animate-fade-in">
      <FilterChips options={TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))} selected={tab} onSelect={setTab} />
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        {tab === 'general' && <GeneralTab subscription={settings?.subscription ?? null} />}
        {tab === 'branding' && <BrandingTab seedColor={settings?.branding?.seed_color ?? null} logoUrl={settings?.branding?.logo_url ?? null} />}
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'danger' && <DangerZone />}
      </div>
    </div>
  );
}
