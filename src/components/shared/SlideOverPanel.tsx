// src/components/shared/SlideOverPanel.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/hooks/use-translations';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SlideOverPanel({ open, onClose, children }: SlideOverPanelProps) {
  const { t } = useT();
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[7000]" role="dialog" aria-modal="true">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[400px] bg-surface shadow-xl border-l border-outline overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between p-sz-lg border-b border-outline-variant">
          <span className="font-heading font-bold text-sm text-on-surface" />
          <button
            onClick={onClose}
            aria-label={t('webSharedClosePanel')}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-sz-lg">{children}</div>
      </div>
    </div>
  );
}
