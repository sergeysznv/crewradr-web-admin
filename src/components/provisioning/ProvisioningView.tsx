// src/components/provisioning/ProvisioningView.tsx
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { useSnackbar } from '@/components/shared/Snackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { tierRank } from '@/lib/utils';
import { Link, Plus, Copy, Trash2, Loader2, Lock, AlertTriangle } from 'lucide-react';
import type { ProvisioningLink } from '@/types/rpc';

export function ProvisioningView() {
  const { t } = useT();
  const { crewId, tier, isCommercial } = useCrew();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ProvisioningLink | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmiral = tierRank(tier) >= 3;
  const showProvisioning = isAdmiral && isCommercial;

  const linksQuery = useQuery({
    queryKey: ['provisioningLinks', crewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_provisioning_links')
        .select()
        .eq('crew_id', crewId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProvisioningLink[];
    },
    enabled: !!crewId && showProvisioning,
  });

  // Realtime — reload links when one is created/revoked/joined.
  useRealtimeInvalidation(
    crewId,
    'admin-provisioning',
    [{ table: 'enterprise_provisioning_links' }],
    ['provisioningLinks', crewId!],
  );

  const links = linksQuery.data ?? [];

  async function createLink() {
    if (!crewId || creating) return;
    setCreating(true);
    try {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const code = Array.from(bytes, (b) => chars[b % chars.length]).join('');
      const { error } = await supabase.from('enterprise_provisioning_links').insert({
        crew_id: crewId,
        code,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['provisioningLinks', crewId] });
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webProvisioningFailed'));
    }
    setCreating(false);
  }

  async function revokeLink(id: string) {
    try {
      const { error } = await supabase.from('enterprise_provisioning_links').update({ status: 'revoked' }).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['provisioningLinks', crewId] });
      showSuccess(t('webProvisioningStatusRevoked'));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('webProvisioningFailed'));
    }
    setRevokeTarget(null);
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`https://crewradr.app/join/${code}`).then(() => {
      setCopied(true);
      showSuccess(t('webProvisioningCopied'));
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      showError(t('webProvisioningClipboardDenied'));
    });
  }

  function statusLabel(s: string, hasKey: boolean, expiresAt?: string) {
    if (s === 'pending' && expiresAt && new Date(expiresAt) < new Date()) return t('webProvisioningStatusExpired');
    switch (s) {
      case 'pending': return hasKey ? t('webProvisioningStatusActive') : t('webProvisioningStatusAwaitingActivation');
      case 'joined': return t('webProvisioningStatusJoined');
      case 'revoked': return t('webProvisioningStatusRevoked');
      default: return t('webProvisioningStatusActive');
    }
  }

  function statusColor(s: string, hasKey: boolean, expiresAt?: string) {
    if (s === 'pending' && expiresAt && new Date(expiresAt) < new Date()) return 'text-error';
    switch (s) {
      case 'pending': return hasKey ? 'text-success' : 'text-warning';
      case 'joined': return 'text-primary';
      case 'revoked': return 'text-error';
      default: return 'text-success';
    }
  }

  // ── Tier gate ──
  if (!showProvisioning) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webProvisioningTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
        <h1 className="text-2xl font-bold text-on-surface">{t('webProvisioningTitle')}</h1>
        <div className="flex-1" />
        {copied && <span className="text-xs text-success animate-fade-in">{t('webProvisioningCopied')}</span>}
        <button onClick={createLink} disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('webProvisioningCreateLink')}
        </button>
      </div>

      <div className="flex-1 overflow-auto pt-2">
        {linksQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : linksQuery.isError ? (
          <div className="flex items-center justify-center py-24 text-center">
            <div>
              <AlertTriangle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
              <p className="mt-2 text-sm text-on-surface-variant">{t('webErrorLoading')}</p>
              <button onClick={() => linksQuery.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t('webRetry')}</button>
            </div>
          </div>
        ) : links.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-center text-sm text-on-surface-variant">
            <div>
              <Link className="mx-auto h-8 w-8 text-on-surface-variant opacity-40" />
              <p className="mt-2">{t('webProvisioningNoLinks')}</p>
              <p className="mt-1 text-xs">{t('webProvisioningNoLinksDesc')}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-4 py-4">
                <Link className="h-5 w-5 text-on-surface-variant shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-on-surface truncate">{l.code}</p>
                  <p className={`text-xs ${statusColor(l.status, !!l.encrypted_crew_key, l.expires_at)}`}>
                    {statusLabel(l.status, !!l.encrypted_crew_key, l.expires_at)}
                    {l.status === 'pending' && t('webProvisioningUsageCount', { count: l.usage_count })}
                  </p>
                </div>
                <button onClick={() => copyLink(l.code)}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary"
                  title={t('webProvisioningCopyLink')} aria-label={t('webProvisioningCopyLink')}>
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={() => setRevokeTarget(l)}
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-error-container hover:text-error"
                  title={t('webProvisioningRevokeLink')} aria-label={t('webProvisioningRevokeLink')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        title={t('webProvisioningRevokeLink')}
        message={t('webProvisioningRevokeConfirm')}
        confirmLabel={t('webProvisioningRevokeLink')}
        destructive
        onConfirm={() => revokeTarget && revokeLink(revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
