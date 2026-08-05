// src/components/integrations/WebhookManager.tsx
'use client';

import { Webhook } from 'lucide-react';
import { useT } from '@/hooks/use-translations';

/**
 * Events a webhook endpoint can subscribe to. The backend does not deliver
 * webhook events yet (the api_gateway edge function only exposes a
 * `webhook/checkin` stub with a TODO), so this list is the planned surface.
 */
export const WEBHOOK_EVENT_OPTIONS = [
  'trip_started',
  'trip_ended',
  'alert_triggered',
  'member_joined',
  'member_left',
  'check_in_completed',
] as const;

const EVENT_LABEL_KEYS: Record<(typeof WEBHOOK_EVENT_OPTIONS)[number], string> = {
  trip_started: 'webWebhooksEventTripStarted',
  trip_ended: 'webWebhooksEventTripEnded',
  alert_triggered: 'webWebhooksEventAlertTriggered',
  member_joined: 'webWebhooksEventMemberJoined',
  member_left: 'webWebhooksEventMemberLeft',
  check_in_completed: 'webWebhooksEventCheckInCompleted',
};

/**
 * Webhooks are not implemented in the backend (no `enterprise_webhooks`
 * table or RPC exists), so this manager renders an informational state
 * instead of dead CRUD against a nonexistent table. When the backend ships,
 * wire the create/toggle/list queries in here.
 */
export function WebhookManager() {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-outline bg-surface p-lg">
        <Webhook className="h-8 w-8 text-on-surface-variant opacity-40" aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold text-on-surface">{t('webWebhooksNotAvailable')}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          {t('webWebhooksNotAvailableDesc')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {WEBHOOK_EVENT_OPTIONS.map((event) => (
            <span
              key={event}
              className="rounded-full border border-outline bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant"
            >
              {t(EVENT_LABEL_KEYS[event])}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
