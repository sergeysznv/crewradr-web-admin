'use client';
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function SlideOverPanel({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-surface border-l border-outline
                      rounded-tl-xl shadow-xl z-50 overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-surface flex justify-end p-3 border-b border-outline-variant">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <X size={18} />
          </button>
        </div>
        <div className="p-lg">{children}</div>
      </div>
    </>
  );
}
