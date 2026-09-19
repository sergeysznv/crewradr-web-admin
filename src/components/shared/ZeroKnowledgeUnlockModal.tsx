'use client';

import { useState } from 'react';
import { useCrewKey } from '@/hooks/useCrewKey';
import { parseCrewKey } from '@/lib/crypto';
import { Lock, Unlock, Key, X, CheckCircle, ShieldAlert } from 'lucide-react';

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
  const { crewKey, hasCrewKey, setCrewKey, clearCrewKey } = useCrewKey();
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseCrewKey(inputKey);
    if (!parsed) {
      setError('Invalid key format. Please enter a valid 32-byte Crew Key (64 hex chars or base64url).');
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
      setError('Failed to store key in session.');
    }
  }

  function handleLock() {
    clearCrewKey();
    setInputKey('');
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-outline/20">
        <button
          onClick={onClose}
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
              {hasCrewKey ? 'Zero-Knowledge Vault Active' : 'Unlock Zero-Knowledge Fleet'}
            </h3>
            <p className="text-xs text-on-surface-variant">Client-side WebCrypto Decryption</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          Crew coordinates are end-to-end encrypted on-device. Enter your 256-bit Crew Security Key
          (found in your CrewRadr mobile app under <strong>Settings → Vault & Keys</strong>) to
          decrypt live locations in this browser tab. Your key never touches the server.
        </p>

        {hasCrewKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-xs text-green-500 font-medium">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Fleet telemetry unlocked for this browser session.</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLock}
                className="flex-1 rounded-xl bg-error/10 hover:bg-error/20 text-error py-2.5 text-sm font-semibold transition-colors"
              >
                Clear Key & Relock
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Crew Decryption Key (Hex or Base64URL)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste 64-char hex or base64url key"
                  className="w-full rounded-xl bg-surface-container px-3 py-2.5 text-sm text-on-surface font-mono placeholder:text-on-surface-variant/50 border border-outline/20 focus:border-primary focus:outline-hidden"
                  autoFocus
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
                  <span>Key verified and unlocked!</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inputKey.trim()}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary py-2.5 text-sm font-semibold transition-colors shadow-sm"
              >
                Unlock Fleet
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
