// src/lib/jurisdiction.ts
'use client';

import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/hooks/use-translations';

export type JurisdictionMode = 'auto' | 'US' | 'INTL';

const STORAGE_KEY = 'crewradr-jurisdiction';

const US_LOCALES = new Set(['en-US', 'es-US']);

/**
 * Returns the effective operating jurisdiction ('US' or 'INTL').
 * If preference is 'auto', it derives from currency and locale.
 */
export function getEffectiveJurisdiction(
  savedPreference: JurisdictionMode | null | undefined,
  currency: string,
  locale: string,
): 'US' | 'INTL' {
  if (savedPreference === 'US') return 'US';
  if (savedPreference === 'INTL') return 'INTL';

  // Currency check: non-USD currencies (EUR, GBP, CAD, AUD, MXN, SAR, AED, CNY, RUB, etc.) indicate non-US jurisdiction
  if (currency && currency !== 'USD') {
    return 'INTL';
  }

  // Locale check
  const normalizedLocale = (locale || '').replace('_', '-');
  const countryCode = normalizedLocale.split('-')[1]?.toUpperCase();

  if (countryCode && countryCode !== 'US') {
    return 'INTL';
  }

  if (US_LOCALES.has(normalizedLocale) || countryCode === 'US') {
    return 'US';
  }

  // If currency is USD and locale is generic English or Spanish without explicit non-US country, default to US
  if (currency === 'USD' && (locale.startsWith('en') || locale.startsWith('es'))) {
    return 'US';
  }

  return 'US';
}

/**
 * Hook providing the active operating jurisdiction, with reactive updates across tabs and components.
 */
export function useJurisdiction() {
  const { currency } = useCurrency();
  const { locale } = useT();

  const [preference, setPreferenceState] = useState<JurisdictionMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as JurisdictionMode | null;
        if (saved === 'US' || saved === 'INTL' || saved === 'auto') return saved;
      } catch {
        // local storage blocked
      }
    }
    return 'auto';
  });

  const setPreference = (mode: JurisdictionMode) => {
    setPreferenceState(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
        window.dispatchEvent(new Event('crewradr-jurisdiction-change'));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as JurisdictionMode | null;
        if (saved === 'US' || saved === 'INTL' || saved === 'auto') {
          setPreferenceState(saved);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('crewradr-jurisdiction-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('crewradr-jurisdiction-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const jurisdiction = getEffectiveJurisdiction(preference, currency, locale);
  const isUS = jurisdiction === 'US';

  return {
    jurisdiction, // 'US' | 'INTL'
    isUS,
    preference,
    setPreference,
  };
}
