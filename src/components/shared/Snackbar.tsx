// src/components/shared/Snackbar.tsx
'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface SnackbarItem { id: number; type: 'success' | 'error'; message: string; undo?: () => void; }

const SnackbarContext = createContext<{
  showSuccess: (message: string, undo?: () => void) => void;
  showError: (message: string) => void;
} | null>(null);

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}

let nextId = 0;

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);

  const remove = useCallback((id: number) => setItems(prev => prev.filter(i => i.id !== id)), []);

  const show = useCallback((type: 'success' | 'error', message: string, undo?: () => void) => {
    const id = nextId++;
    setItems(prev => [...prev, { id, type, message, undo }]);
    setTimeout(() => remove(id), 5000);
  }, [remove]);

  const showSuccess = useCallback((m: string, u?: () => void) => show('success', m, u), [show]);
  const showError = useCallback((m: string) => show('error', m), [show]);

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold
            ${item.type === 'success' ? 'bg-on-surface text-surface' : 'bg-error-container text-error'}`}>
            {item.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{item.message}</span>
            {item.undo && (
              <button onClick={() => { item.undo!(); remove(item.id); }}
                className="ml-2 underline text-xs font-bold">Undo</button>
            )}
            <button onClick={() => remove(item.id)} className="ml-2"><X size={14} /></button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}
