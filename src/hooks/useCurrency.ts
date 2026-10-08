'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  CurrencyCode,
  CURRENCIES,
  defaultCurrencyForLocale,
  currencyOptionsForLocale,
  formatCurrencyFromUsd,
  convertFromUsd,
} from '@/lib/currency';
import { getLocale, subscribeToLocale } from '@/hooks/use-translations';

const STORAGE_KEY = 'crewradr-currency';

const currencyListeners = new Set<() => void>();

function subscribeCurrency(fn: () => void) {
  currencyListeners.add(fn);
  return () => {
    currencyListeners.delete(fn);
  };
}

function notifyCurrency() {
  currencyListeners.forEach((fn) => fn());
}

function readStoredCurrency(): CurrencyCode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
  return stored && CURRENCIES[stored] ? stored : null;
}

export function useCurrency() {
  const locale = useSyncExternalStore(subscribeToLocale, getLocale, getLocale);
  // A manually pinned currency wins; otherwise follow the locale's default.
  const storedCurrency = useSyncExternalStore(subscribeCurrency, readStoredCurrency, () => null);
  const currency: CurrencyCode = storedCurrency ?? defaultCurrencyForLocale(locale);

  const setCurrency = useCallback((next: CurrencyCode) => {
    if (!CURRENCIES[next]) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
    notifyCurrency();
  }, []);

  const resetToLocaleDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    notifyCurrency();
  }, []);

  const availableCurrencies = currencyOptionsForLocale(locale);

  const formatMoney = useCallback(
    (amountUsd: number, fractionDigits = 2) => {
      return formatCurrencyFromUsd(amountUsd, currency, fractionDigits);
    },
    [currency],
  );

  const convertMoney = useCallback(
    (amountUsd: number) => {
      return convertFromUsd(amountUsd, currency);
    },
    [currency],
  );

  return {
    currency,
    currencyConfig: CURRENCIES[currency],
    availableCurrencies,
    allCurrencies: Object.values(CURRENCIES),
    setCurrency,
    resetToLocaleDefault,
    formatMoney,
    convertMoney,
  };
}
