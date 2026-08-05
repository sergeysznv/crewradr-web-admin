// src/components/integrations/IntegrationsView.tsx
'use client';

import { WebhookManager } from '@/components/integrations/WebhookManager';
import { ApiKeyDashboard } from '@/components/integrations/ApiKeyDashboard';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { Lock } from 'lucide-react';

const LOCKED_FALLBACK = (
  <div className="flex flex-1 items-center justify-center py-24" role="status">
    <div className="text-center max-w-sm">
      <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold text-on-surface">Integrations</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Integrations are available on the Admiral plan. Upgrade to connect webhooks and API keys.
      </p>
    </div>
  </div>
);

export function IntegrationsView() {
  return (
    <TierGateGuard minTier="admiral" fallback={LOCKED_FALLBACK}>
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-2xl font-bold text-on-surface">Integrations</h1>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-bold text-on-surface">Webhooks</h2>
            <div className="mt-4">
              <WebhookManager />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-on-surface">API Keys</h2>
            <div className="mt-4">
              <ApiKeyDashboard />
            </div>
          </section>
        </div>
      </div>
    </TierGateGuard>
  );
}
