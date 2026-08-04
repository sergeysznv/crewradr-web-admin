// src/components/shared/ConfirmDialog.tsx
'use client';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ open, title, message, confirmLabel, destructive = false, confirmDisabled = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string;
  destructive?: boolean; confirmDisabled?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-surface border border-outline rounded-xxl p-xl max-w-[420px] w-full mx-lg pointer-events-auto shadow-xl">
          <h2 className="font-heading font-extrabold text-lg text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant mt-2">{message}</p>
          <div className="flex gap-3 mt-lg justify-end">
            <button onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={confirmDisabled} title={confirmDisabled ? 'Coming soon' : undefined}
              className={`px-4 py-2 rounded-xl text-sm font-semibold text-white
                ${confirmDisabled
                  ? `${destructive ? 'bg-error' : 'bg-primary'} opacity-40 cursor-not-allowed`
                  : destructive ? 'bg-error hover:opacity-90' : 'bg-primary hover:opacity-90'}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
