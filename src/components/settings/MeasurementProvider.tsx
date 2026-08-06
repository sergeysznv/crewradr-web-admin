'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import type { MeasurementSystem } from '@/lib/units';

export type MeasurementContextValue = {
  system: MeasurementSystem;
  setAndSync: (next: MeasurementSystem) => Promise<void>;
};

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

/**
 * Provides the active measurement system to the whole app tree.
 * Wraps `useMeasurementSystem()` once so consumers can read the value via
 * `useMeasurementContext()` instead of opening their own Realtime subscription.
 */
export function MeasurementProvider({ children }: { children: ReactNode }) {
  const { system, setAndSync } = useMeasurementSystem();

  return (
    <MeasurementContext.Provider value={{ system, setAndSync }}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurementContext(): MeasurementContextValue {
  const ctx = useContext(MeasurementContext);
  if (!ctx) {
    throw new Error('useMeasurementContext must be used within a MeasurementProvider');
  }
  return ctx;
}
