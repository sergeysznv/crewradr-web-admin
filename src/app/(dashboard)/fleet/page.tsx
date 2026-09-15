// src/app/(dashboard)/fleet/page.tsx
'use client';

import { Lock } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { TierGateGuard } from '@/components/tier/TierGateGuard';

function FleetLockedFallback() {
  const { t } = useT();
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status">
      <div className="text-center max-w-sm">
        <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webNavFleet')}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <TierGateGuard minTier="firstMate" fallback={<FleetLockedFallback />}>
      <DashboardView />
    </TierGateGuard>
  );
}
