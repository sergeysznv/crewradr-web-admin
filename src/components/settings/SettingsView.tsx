// src/components/settings/SettingsView.tsx
'use client';
import { useState } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { useCrewSettings } from '@/hooks/queries/useCrewSettings';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { GeneralTab } from '@/components/settings/GeneralTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { DangerZone } from '@/components/settings/DangerZone';
import { FilterChips } from '@/components/shared/FilterChips';

// The SSO tab slot is reserved: it stays hidden until the backend returns
// `sso_enabled: true` in crew settings (CrewSettings.sso_enabled). Do not
// add an SSO tab here before that flag exists.
const TABS = [
  { value: 'general' as const, label: 'General' },
  { value: 'branding' as const, label: 'Branding' },
  { value: 'danger' as const, label: 'Danger Zone' },
];

type Tab = typeof TABS[number]['value'];

export function SettingsView() {
  const { crewId } = useCrew();
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
    <div className="max-w-[720px] space-y-lg">
      <FilterChips options={TABS} selected={tab} onSelect={setTab} />
      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
        {tab === 'general' && <GeneralTab subscription={settings?.subscription ?? null} />}
        {tab === 'branding' && <BrandingTab seedColor={settings?.branding?.seed_color ?? null} logoUrl={settings?.branding?.logo_url ?? null} />}
        {tab === 'danger' && <DangerZone />}
      </div>
    </div>
  );
}
