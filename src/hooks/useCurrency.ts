'use client';

import { useState, useEffect, useCallback } from 'react';
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

export function useCurrency() {
  const [locale, setLocaleState] = useState<string>(getLocale());
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  // Load stored currency on mount or default based on current locale
  useEffect(() => {
    const currentLoc = getLocale();
    setLocaleState(currentLoc);
    const stored = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as CurrencyCode | null) : null;
    if (stored && CURRENCIES[stored]) {
      setCurrencyState(stored);
    } else {
      setCurrencyState(defaultCurrencyForLocale(currentLoc));
    }
  }, []);

  // Listen to locale changes
  useEffect(() => {
    return subscribeToLocale(() => {
      const nextLoc = getLocale();
      setLocaleState(nextLoc);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      // If user hasn't manually pinned a different currency, adapt to new locale's currency
      if (!stored) {
        setCurrencyState(defaultCurrencyForLocale(nextLoc));
      }
    });
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    if (!CURRENCIES[next]) return;
    setCurrencyState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const resetToLocaleDefault = useCallback(() => {
    const def = defaultCurrencyForLocale(locale);
    setCurrencyState(def);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [locale]);

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
