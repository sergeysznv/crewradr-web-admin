// src/components/shared/ConfirmDialog.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';

interface VerifyTextConfig {
  match: string;
  placeholder: string;
  label: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  confirmDisabled?: boolean;
  verifyText?: VerifyTextConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  pending = false,
  confirmDisabled = false,
  verifyText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useT();
  const [verifyInput, setVerifyInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setVerifyInput('');
      // Focus the verify input after the dialog renders.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const verificationFailed = verifyText
    ? verifyInput.trim().toLowerCase() !== verifyText.match.trim().toLowerCase()
    : false;
  const isConfirmDisabled = confirmDisabled || pending || verificationFailed;

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl border border-outline">
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
              <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-on-surface">{title}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{message}</p>
          </div>
        </div>

        {verifyText && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">
              {verifyText.label}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder={verifyText.placeholder}
              className="w-full rounded-xl border border-outline bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50"
              autoComplete="off"
            />
          </div>
        )}

        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            {t('webSharedCancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              destructive
                ? 'bg-error hover:opacity-90'
                : 'bg-primary hover:opacity-90'
            }`}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
