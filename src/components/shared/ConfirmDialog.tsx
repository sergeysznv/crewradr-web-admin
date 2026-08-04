// src/components/shared/ConfirmDialog.tsx
'use client';
import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Confirmation dialog. When `verifyText` is provided, the confirm button
 * stays disabled until the user types the matching value (destructive
 * actions that require typing the member name, etc.). Give the dialog a
 * `key` that changes per open to reset the verify input.
 */
export function ConfirmDialog({ open, title, message, confirmLabel, destructive = false, confirmDisabled = false, verifyText, pending = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string;
  destructive?: boolean; confirmDisabled?: boolean;
  verifyText?: { match: string; placeholder?: string; label?: string };
  pending?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const [verifyValue, setVerifyValue] = useState('');

  if (!open) return null;

  const matches = verifyText ? verifyValue.trim() === verifyText.match : true;
  const disabled = confirmDisabled || !matches || pending;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-surface border border-outline rounded-xxl p-xl max-w-[420px] w-full mx-lg pointer-events-auto shadow-xl" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <h2 id="confirm-title" className="font-heading font-extrabold text-lg text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant mt-2">{message}</p>
          {verifyText && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {verifyText.label ?? 'Type to confirm'}
              </label>
              <input
                type="text"
                value={verifyValue}
                onChange={e => setVerifyValue(e.target.value)}
                placeholder={verifyText.placeholder}
                autoFocus
                className="mt-1 w-full rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
                aria-label={verifyText.label ?? 'Type to confirm'}
              />
            </div>
          )}
          <div className="flex gap-3 mt-lg justify-end">
            <button onClick={onCancel} disabled={pending}
              className="px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={disabled}
              className={`px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2
                ${disabled
                  ? `${destructive ? 'bg-error' : 'bg-primary'} opacity-40 cursor-not-allowed`
                  : destructive ? 'bg-error hover:opacity-90' : 'bg-primary hover:opacity-90'}`}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
