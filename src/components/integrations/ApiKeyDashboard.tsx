// src/components/integrations/ApiKeyDashboard.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useT } from '@/hooks/use-translations';
import { KeyRound, Plus, Copy, Trash2, Loader2, Check } from 'lucide-react';

/**
 * API keys live in `api_keys` with only a SHA-256 hash of the full key.
 * RLS (`api_keys_select_own` / `api_keys_insert_own` / `api_keys_delete_own`)
 * scopes every operation to keys created by the signed-in user — there is no
 * UPDATE policy, so revoking is a hard DELETE. The full key is shown exactly
 * once at creation time (`cb_<base64url>`), mirroring the mobile app's
 * ApiKeyService.
 */

interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  scopes: string[];
  rate_limit_rpm: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const SCOPE_OPTIONS = ['read:crew', 'read:locations'] as const;
const RATE_LIMIT_OPTIONS = [60, 120, 300, 600] as const;

function generateRawKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `cb_${b64}`;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function ApiKeyDashboard() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { crewId } = useCrew();
  const { showSuccess, showError } = useSnackbar();
  const { t } = useT();

  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:crew']);
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  const { data: apiKeys = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      // RLS scopes results to the signed-in user's own keys.
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_hash, scopes, rate_limit_rpm, is_active, last_used_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiKeyRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');

      // Resolve the app-level user id (public.users.id) — api_keys.created_by
      // references public.users(id), and the insert policy requires
      // created_by = current user.
      const { data: appUser, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (userErr || !appUser) throw userErr ?? new Error('Could not resolve user');

      const raw = generateRawKey();
      const keyHash = await sha256Hex(raw);
      const { error } = await supabase.from('api_keys').insert({
        created_by: appUser.id,
        crew_id: crewId,
        name,
        key_hash: keyHash,
        scopes,
        rate_limit_rpm: rateLimitRpm,
      });
      if (error) throw error;
      return raw;
    },
    onSuccess: (raw) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setCreatedKey(raw);
      setName('');
      setScopes(['read:crew']);
      setRateLimitRpm(60);
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : t('webApiKeyCreateFailed'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Hard revoke — the api_keys RLS grants DELETE but not UPDATE.
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      showSuccess(t('webApiKeyRevoked'));
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : t('webApiKeyRevokeFailed'));
    },
  });

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey).then(() => {
      setCopied(true);
      showSuccess(t('webApiKeyCopied'));
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => showError(t('webApiKeyClipboardDenied')));
  }

  return (
    <div className="space-y-4">
      {/* ── Create key ── */}
      <div className="rounded-2xl border border-outline bg-surface p-sz-lg">
        <h3 className="text-base font-semibold text-on-surface">{t('webApiKeyCreateTitle')}</h3>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('webApiKeyNamePlaceholder')}
            className="w-full rounded-lg border border-outline bg-surface-container px-4 py-2 text-sm text-on-surface"
          />
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webApiKeyScopes')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    scopes.includes(scope)
                      ? 'bg-primary-container text-on-primary-container border border-outline'
                      : 'bg-surface-container text-on-surface-variant border border-outline'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('webApiKeyRateLimit')}</p>
            <select
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(Number(e.target.value))}
              className="mt-2 rounded-lg border border-outline bg-surface-container px-4 py-2 text-sm text-on-surface"
            >
              {RATE_LIMIT_OPTIONS.map((rpm) => (
                <option key={rpm} value={rpm}>
                  {t('webApiKeyReqMin', { rpm })}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {createMutation.isPending ? t('webApiKeyGenerating') : t('webApiKeyGenerate')}
          </button>
        </div>
      </div>

      {/* ── Existing keys ── */}
      <div>
        <h3 className="text-base font-semibold text-on-surface">{t('webApiKeyTitle')}</h3>
        {isLoading ? (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-2 flex items-center justify-center rounded-2xl border border-outline bg-surface py-8 text-center">
            <div>
              <p className="text-sm text-on-surface-variant">{t('webApiKeyLoadFailed')}</p>
              <button onClick={() => refetch()} className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary">
                {t('webSharedRetry')}
              </button>
            </div>
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">{t('webApiKeyNoKeys')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between gap-3 rounded-2xl border border-outline bg-surface p-4">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-on-surface truncate">{key.name}</span>
                  <p className="text-xs text-on-surface-variant font-mono truncate">
                    cb_••••••••{key.key_hash.slice(0, 8)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {key.scopes.map((s) => (
                      <span key={s} className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] text-on-primary-container">
                        {s}
                      </span>
                    ))}
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
                      {t('webApiKeyReqMin', { rpm: key.rate_limit_rpm })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${key.is_active ? 'bg-success/15 text-success' : 'bg-surface-container text-on-surface-variant'}`}>
                      {key.is_active ? t('webApiKeyActive') : t('webApiKeyRevokedStatus')}
                    </span>
                    {key.last_used_at && (
                      <p className="mt-1 text-[10px] text-on-surface-variant/60">
                        {t('webApiKeyLastUsed', { date: new Date(key.last_used_at).toLocaleDateString() })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setRevokeTarget(key)}
                    className="rounded-lg p-2 text-on-surface-variant hover:bg-error-container hover:text-error"
                    title={t('webApiKeyRevoke')}
                    aria-label={t('webApiKeyRevokeAria', { name: key.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Key shown once ── */}
      {createdKey && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('webApiKeyCreated')}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreatedKey(null)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-surface p-6 shadow-sm border border-outline">
            <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-on-surface">{t('webApiKeyCreated')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t('webApiKeyCreatedHint')}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-outline bg-surface-container p-3">
              <code className="flex-1 truncate font-mono text-sm text-on-surface" title={createdKey}>
                {createdKey}
              </code>
              <button onClick={copyKey} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary" title={t('webApiKeyCopy')} aria-label={t('webApiKeyCopy')}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              {t('webApiKeyDone')}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        title={t('webApiKeyRevokeDialogTitle')}
        message={t('webApiKeyRevokeMessage', { name: revokeTarget?.name ?? '' })}
        confirmLabel={t('webRevoke')}
        destructive
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
