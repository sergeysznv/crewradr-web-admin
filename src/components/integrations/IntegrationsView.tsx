// src/components/integrations/IntegrationsView.tsx
'use client';

import { ApiKeyDashboard } from '@/components/integrations/ApiKeyDashboard';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { useT } from '@/hooks/use-translations';
import { Lock } from 'lucide-react';

function LockedFallback() {
  const { t } = useT();
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status">
      <div className="text-center max-w-sm">
        <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webIntegrationsTitle')}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t('webIntegrationsLockedDesc')}
        </p>
      </div>
    </div>
  );
}

export function IntegrationsView() {
  const { t } = useT();
  return (
    <TierGateGuard minTier="admiral" fallback={<LockedFallback />}>
      <div className="space-y-lg animate-fade-in">
        <h1 className="text-2xl font-bold text-on-surface">{t('webIntegrationsTitle')}</h1>

        <div>
          <section>
            <h2 className="text-lg font-bold text-on-surface">{t('webIntegrationsApiKeys')}</h2>
            <div className="mt-4">
              <ApiKeyDashboard />
            </div>
          </section>
        </div>
      </div>
    </TierGateGuard>
  );
}
