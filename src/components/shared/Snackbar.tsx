// src/components/shared/Snackbar.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface SnackbarItem {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface SnackbarContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

let _nextId = 0;

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const add = useCallback(
    (type: 'success' | 'error', message: string) => {
      const id = ++_nextId;
      setItems((prev) => [...prev.slice(-4), { id, type, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const showSuccess = useCallback((m: string) => add('success', m), [add]);
  const showError = useCallback((m: string) => add('error', m), [add]);

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            role="alert"
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-outline bg-surface px-4 py-3 shadow-lg animate-fade-in max-w-sm"
          >
            {item.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-error" aria-hidden="true" />
            )}
            <p className="text-sm text-on-surface flex-1">{item.message}</p>
            <button
              onClick={() => remove(item.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-on-surface-variant hover:text-on-surface"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}
