'use client';

import { useEffect, useRef, useState } from 'react';
import { useCrewKey } from '@/hooks/useCrewKey';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { parseCrewKey } from '@/lib/crypto';
import { cancelWebKeyHandoff, createWebKeyHandoff, getWebKeyHandoff } from '@/lib/rpc';
import { WebKeyHandoffSession, type HandoffState } from '@/lib/webKeyHandoff';
import { Lock, Unlock, Key, X, CheckCircle, ShieldAlert, Copy, Loader2, RefreshCw } from 'lucide-react';

interface ZeroKnowledgeUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ZeroKnowledgeUnlockModal({
  isOpen,
  onClose,
  onSuccess,
}: ZeroKnowledgeUnlockModalProps) {
  const { t } = useT();
  const supabase = useSupabase();
  const { crewId } = useCrew();
  const { hasCrewKey, setCrewKey, clearCrewKey } = useCrewKey();
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pairing, setPairing] = useState<HandoffState>({ phase: 'idle' });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const handlers = useRef({ setCrewKey, onSuccess, onClose });
  useEffect(() => {
    handlers.current = { setCrewKey, onSuccess, onClose };
  });

  // One pairing session per open/attempt; leaving cancels it and drops the
  // ephemeral private key.
  useEffect(() => {
    if (!isOpen || hasCrewKey || !crewId) return;
    const session = new WebKeyHandoffSession(crewId, {
      create: (cid, pub) => createWebKeyHandoff(supabase, cid, pub),
      get: (id) => getWebKeyHandoff(supabase, id),
      cancel: (id) => cancelWebKeyHandoff(supabase, id),
    });
    const unsub = session.subscribe((s) => {
      setPairing(s);
      if (s.phase === 'success') {
        const ok = handlers.current.setCrewKey(s.crewKey);
        if (ok) {
          setTimeout(() => {
            handlers.current.onSuccess?.();
            handlers.current.onClose();
          }, 700);
        } else {
          setPairing({ phase: 'error', message: 'store_failed' });
        }
      }
    });
    void session.start();
    return () => {
      unsub();
      session.cancel();
      setPairing({ phase: 'idle' });
      setQrUrl(null);
    };
  }, [isOpen, hasCrewKey, crewId, supabase, attempt]);

  const pairingCode = pairing.phase === 'waiting' ? pairing.pairingCode : null;
  useEffect(() => {
    if (!pairingCode) return;
    let cancelled = false;
    import('qrcode')
      .then((qr) => qr.toDataURL(pairingCode, { errorCorrectionLevel: 'M', margin: 2, width: 232 }))
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pairingCode]);

  if (!isOpen) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseCrewKey(inputKey);
    if (!parsed) {
      setError(t('zkUnlockInvalidKey'));
      return;
    }

    const ok = setCrewKey(inputKey);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setInputKey('');
        onSuccess?.();
        onClose();
      }, 700);
    } else {
      setError(t('zkUnlockStoreFailed'));
    }
  }

  function handleLock() {
    clearCrewKey();
    setInputKey('');
    setError(null);
    onClose();
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the code stays selectable on screen */
    }
  }

  function pairingError(s: Extract<HandoffState, { phase: 'error' }>): string {
    if (s.message === 'decrypt_failed') return t('zkUnlockErrorDecrypt');
    if (s.message === 'store_failed') return t('zkUnlockStoreFailed');
    if (/mfa|multi-factor/i.test(s.message)) return t('zkUnlockErrorMfa');
    return t('zkUnlockErrorGeneric');
  }

  const retryBtn = (
    <button
      type="button"
      onClick={() => setAttempt((n) => n + 1)}
      className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 text-sm font-semibold transition-colors"
    >
      <RefreshCw className="h-4 w-4" />
      {t('zkUnlockRetry')}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl border border-outline/20">
        <button
          onClick={onClose}
          aria-label={t('cancel')}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {hasCrewKey ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">
              {hasCrewKey ? t('zkUnlockTitleActive') : t('zkUnlockTitleLocked')}
            </h3>
            <p className="text-xs text-on-surface-variant">{t('zkUnlockSubtitle')}</p>
          </div>
        </div>

        {hasCrewKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-xs text-green-500 font-medium">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{t('zkUnlockActiveBanner')}</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLock}
                className="flex-1 rounded-xl bg-error/10 hover:bg-error/20 text-error py-2.5 text-sm font-semibold transition-colors"
              >
                {t('zkUnlockClear')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 text-sm font-semibold transition-colors"
              >
                {t('zkUnlockClose')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">{t('zkUnlockIntro')}</p>

            {!crewId && (
              <div className="flex items-center gap-1.5 text-xs text-error">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{t('zkUnlockNeedCrew')}</span>
              </div>
            )}

            {(pairing.phase === 'creating' || pairing.phase === 'decrypting') && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {pairing.phase === 'creating' ? t('zkUnlockCreating') : t('zkUnlockDecrypting')}
                </span>
              </div>
            )}

            {pairing.phase === 'waiting' && (
              <div className="space-y-3">
                <p className="text-sm text-on-surface">{t('zkUnlockScanInstruction')}</p>
                <div className="flex justify-center">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrUrl}
                      alt={t('zkUnlockQrAlt')}
                      width={232}
                      height={232}
                      className="rounded-xl bg-white"
                    />
                  ) : (
                    <div className="flex h-[232px] w-[232px] items-center justify-center rounded-xl bg-surface-container">
                      <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
                    </div>
                  )}
                </div>
                <div className="text-center text-xs text-on-surface-variant">
                  {t('zkUnlockFingerprint')}:{' '}
                  <span className="font-mono font-semibold text-on-surface">{pairing.fingerprint}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('zkUnlockWaiting')}</span>
                </div>
                <details className="rounded-xl border border-outline/20 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant">
                    {t('zkUnlockNoScan')}
                  </summary>
                  <p className="mt-2 text-xs text-on-surface-variant">{t('zkUnlockCodeHelp')}</p>
                  <div className="mt-2 flex items-start gap-2">
                    <code
                      data-testid="zk-manual-code"
                      className="flex-1 break-all rounded-lg bg-surface-container p-2 text-[10px] text-on-surface select-all"
                    >
                      {pairing.manualCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyCode(pairing.manualCode)}
                      className="rounded-lg bg-surface-container hover:bg-surface-container-high p-2 text-on-surface"
                      aria-label={t('zkUnlockCopy')}
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </details>
              </div>
            )}

            {pairing.phase === 'expired' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-error">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('zkUnlockExpired')}</span>
                </div>
                {retryBtn}
              </div>
            )}

            {pairing.phase === 'error' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-error">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  <span>{pairingError(pairing)}</span>
                </div>
                {retryBtn}
              </div>
            )}

            {pairing.phase === 'success' && (
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{t('zkUnlockVerified')}</span>
              </div>
            )}

            <details className="rounded-xl border border-outline/20 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant">
                {t('zkUnlockManualToggle')}
              </summary>
              <form onSubmit={handleSave} className="mt-3 space-y-3">
                <p className="text-xs text-on-surface-variant">{t('zkUnlockManualWarn')}</p>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    {t('zkUnlockKeyLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => {
                        setInputKey(e.target.value);
                        setError(null);
                      }}
                      placeholder={t('zkUnlockKeyPlaceholder')}
                      className="w-full rounded-xl bg-surface-container px-3 py-2.5 text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 border border-outline/20 focus:border-primary focus:outline-hidden"
                    />
                    <Key className="absolute right-3 top-3 h-4 w-4 text-on-surface-variant/50" />
                  </div>
                  {error && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-error">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-500">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('zkUnlockVerified')}</span>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary py-2.5 text-sm font-semibold transition-colors shadow-sm"
                >
                  {t('zkUnlockUnlockBtn')}
                </button>
              </form>
            </details>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 text-sm font-semibold transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
