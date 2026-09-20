'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import type { CurrencyCode, CurrencyConfig } from '@/lib/currency';

export type CurrencyContextValue = {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  availableCurrencies: CurrencyCode[];
  allCurrencies: CurrencyConfig[];
  setCurrency: (code: CurrencyCode) => void;
  resetToLocaleDefault: () => void;
  formatMoney: (amountUsd: number, fractionDigits?: number) => string;
  convertMoney: (amountUsd: number) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const value = useCurrency();

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return ctx;
}
