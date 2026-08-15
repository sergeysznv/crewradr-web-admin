// src/components/integrations/WebhookManager.tsx
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Webhook, Plus, Trash2, Eye, EyeOff, Check, X, Loader2, Play, Pause, AlertTriangle } from 'lucide-react';

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

interface WebhookEndpoint {
  id: string;
  crew_id: string;
  url: string;
  secret: string;
  events: string[];
  status: 'active' | 'inactive';
  created_at: string;
}

export function WebhookManager() {
  const { t } = useT();
  const { crewId } = useCrew();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  // Dialog/Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Query webhooks
  const { data: webhooks = [], isLoading, error } = useQuery({
    queryKey: ['enterpriseWebhooks', crewId],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('enterprise_webhooks')
        .select()
        .eq('crew_id', crewId!);
      if (qErr) throw qErr;
      return (data ?? []) as WebhookEndpoint[];
    },
    enabled: !!crewId,
  });

  // Generate random signing secret
  function generateSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return 'whsec_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Create webhook
  async function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    if (selectedEvents.length === 0) {
      showError(t('webWebhooksSelectAtLeastOneEvent') || 'Please select at least one event subscription.');
      return;
    }

    setSubmitting(true);
    try {
      const secret = generateSecret();
      const { error: insErr } = await supabase.from('enterprise_webhooks').insert({
        crew_id: crewId,
        url: url.trim(),
        secret,
        events: selectedEvents,
        status: 'active',
      });
      if (insErr) throw insErr;

      showSuccess(t('webWebhooksCreated') || 'Webhook endpoint registered successfully.');
      setUrl('');
      setSelectedEvents([]);
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['enterpriseWebhooks', crewId] });
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webWebhooksRegisterFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  // Toggle webhook status
  async function toggleStatus(webhook: WebhookEndpoint) {
    const nextStatus = webhook.status === 'active' ? 'inactive' : 'active';
    try {
      const { error: updErr } = await supabase
        .from('enterprise_webhooks')
        .update({ status: nextStatus })
        .eq('id', webhook.id);
      if (updErr) throw updErr;

      showSuccess(
        nextStatus === 'active'
          ? t('webWebhooksStatusActivated') || 'Webhook activated.'
          : t('webWebhooksStatusDeactivated') || 'Webhook deactivated.'
      );
      queryClient.invalidateQueries({ queryKey: ['enterpriseWebhooks', crewId] });
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webWebhooksToggleFailed'));
    }
  }

  // Delete webhook
  async function handleDeleteWebhook(id: string) {
    try {
      const { error: delErr } = await supabase.from('enterprise_webhooks').delete().eq('id', id);
      if (delErr) throw delErr;

      showSuccess(t('webWebhooksDeleted') || 'Webhook endpoint deleted.');
      queryClient.invalidateQueries({ queryKey: ['enterpriseWebhooks', crewId] });
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webWebhooksDeleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }

  // Toggle visible secret key
  function toggleRevealSecret(id: string) {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Toggle event selection
  function handleToggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-surface-container animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-error" />
        <h3 className="mt-2 font-semibold text-on-surface">{t('webWebhooksLoadFailed')}</h3>
        <p className="text-xs text-on-surface-variant mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant">
            {t('webWebhooksSubtitle') || 'Deliver real-time location and safety events directly to your servers.'}
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t('webWebhooksAddEndpoint') || 'Add Endpoint'}
          </button>
        )}
      </div>

      {/* Add Webhook Form */}
      {showAddForm && (
        <form onSubmit={handleAddWebhook} className="rounded-xl border border-outline bg-surface p-sz-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h3 className="text-sm font-bold text-on-surface">{t('webWebhooksNewEndpointTitle')}</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="webhook-url" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {t('webWebhooksUrlLabel') || 'Payload URL'}
            </label>
            <input
              id="webhook-url"
              type="url"
              required
              placeholder="https://your-server.com/webhooks/crewradr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-outline bg-surface px-4 py-2 text-sm text-on-surface focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
              {t('webWebhooksEventsLabel') || 'Event Subscriptions'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WEBHOOK_EVENT_OPTIONS.map((event) => {
                const label = t(EVENT_LABEL_KEYS[event]) || event.replace(/_/g, ' ');
                const checked = selectedEvents.includes(event);
                return (
                  <label
                    key={event}
                    className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary bg-primary-container/20 text-primary'
                        : 'border-outline hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleEvent(event)}
                      className="rounded border-outline text-primary focus:ring-primary/30"
                    />
                    <span className="text-xs font-medium capitalize">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('webWebhooksAdd') || 'Register Endpoint'}
            </button>
          </div>
        </form>
      )}

      {/* Webhook Endpoints List */}
      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline bg-surface p-8 text-center">
          <Webhook className="mx-auto h-8 w-8 text-on-surface-variant opacity-40" />
          <h3 className="mt-3 text-base font-semibold text-on-surface">{t('webWebhooksNoEndpoints') || 'No Webhook Endpoints'}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            {t('webWebhooksNoEndpointsDesc') || 'Configure an endpoint to receive real-time updates about location and safety events.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-xl border border-outline bg-surface p-sz-lg space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-on-surface break-all">{wh.url}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        wh.status === 'active'
                          ? 'bg-success-container/20 text-success'
                          : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'
                      }`}
                    >
                      {wh.status === 'active' ? t('webWebhooksStatusActive') || 'Active' : t('webWebhooksStatusInactive') || 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                    <span>{t('webWebhooksSigningSecret')}</span>
                    <span>{revealedSecrets[wh.id] ? wh.secret : '••••••••••••••••••••••••••••••••'}</span>
                    <button
                      onClick={() => toggleRevealSecret(wh.id)}
                      className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high"
                      title={revealedSecrets[wh.id] ? t('webWebhooksHideSecret') : t('webWebhooksRevealSecret')}
                    >
                      {revealedSecrets[wh.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(wh)}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary"
                    title={wh.status === 'active' ? t('webWebhooksDeactivate') : t('webWebhooksActivate')}
                  >
                    {wh.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(wh)}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                    title={t('webWebhooksDeleteEndpoint')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Subscribed Events Chips */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-outline-variant">
                {wh.events.map((event) => {
                  const label = t(EVENT_LABEL_KEYS[event as keyof typeof EVENT_LABEL_KEYS]) || event.replace(/_/g, ' ');
                  return (
                    <span
                      key={event}
                      className="rounded-full border border-outline bg-surface-container px-2.5 py-0.5 text-[10px] font-medium text-on-surface-variant"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('webWebhooksDeleteTitle') || 'Delete Webhook Endpoint'}
        message={
          t('webWebhooksDeleteConfirm') ||
          'Are you sure you want to delete this webhook endpoint? You will stop receiving event notifications immediately.'
        }
        confirmLabel={t('delete') || 'Delete'}
        destructive
        onConfirm={() => deleteTarget && handleDeleteWebhook(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
