// src/components/integrations/IntegrationsView.tsx
'use client';

import { useState } from 'react';
import { ApiKeyDashboard } from '@/components/integrations/ApiKeyDashboard';
import { WebhookManager } from '@/components/integrations/WebhookManager';
import { FilterChips } from '@/components/shared/FilterChips';
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
  const { isCommercial } = useCrew();
  const [tab, setTab] = useState<'apiKeys' | 'webhooks'>('apiKeys');

  if (!isCommercial) {
    return <LockedFallback />;
  }

  return (
    <TierGateGuard minTier="admiral" fallback={<LockedFallback />}>
      <div className="space-y-sz-lg animate-fade-in">
        <h1 className="text-2xl font-bold text-on-surface">{t('webIntegrationsTitle')}</h1>

        <FilterChips
          options={[
            { value: 'apiKeys', label: t('webIntegrationsApiKeys') || 'API Keys' },
            { value: 'webhooks', label: t('webIntegrationsWebhooks') || 'Webhooks' },
          ]}
          selected={tab}
          onSelect={setTab}
        />

        <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl mt-4">
          {tab === 'apiKeys' && <ApiKeyDashboard />}
          {tab === 'webhooks' && <WebhookManager />}
        </div>
      </div>
    </TierGateGuard>
  );
}
