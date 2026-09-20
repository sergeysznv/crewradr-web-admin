export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'MXN'
  | 'SAR'
  | 'AED'
  | 'EGP'
  | 'QAR'
  | 'CNY'
  | 'HKD'
  | 'TWD'
  | 'RUB'
  | 'CHF';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  ratePerUsd: number;
  symbolPosition: 'prefix' | 'suffix';
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', ratePerUsd: 1.0, symbolPosition: 'prefix', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', ratePerUsd: 0.92, symbolPosition: 'prefix', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', ratePerUsd: 0.77, symbolPosition: 'prefix', flag: '🇬🇧' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', ratePerUsd: 1.36, symbolPosition: 'prefix', flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', ratePerUsd: 1.50, symbolPosition: 'prefix', flag: '🇦🇺' },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', ratePerUsd: 18.5, symbolPosition: 'prefix', flag: '🇲🇽' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', ratePerUsd: 3.75, symbolPosition: 'suffix', flag: '🇸🇦' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', ratePerUsd: 3.67, symbolPosition: 'suffix', flag: '🇦🇪' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', ratePerUsd: 48.5, symbolPosition: 'prefix', flag: '🇪🇬' },
  QAR: { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', ratePerUsd: 3.64, symbolPosition: 'suffix', flag: '🇶🇦' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', ratePerUsd: 7.15, symbolPosition: 'prefix', flag: '🇨🇳' },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', ratePerUsd: 7.78, symbolPosition: 'prefix', flag: '🇭🇰' },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', ratePerUsd: 32.0, symbolPosition: 'prefix', flag: '🇹🇼' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', ratePerUsd: 92.5, symbolPosition: 'suffix', flag: '🇷🇺' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', ratePerUsd: 0.88, symbolPosition: 'prefix', flag: '🇨🇭' },
};

export const LANGUAGE_CURRENCIES: Record<string, { default: CurrencyCode; options: CurrencyCode[] }> = {
  en: { default: 'USD', options: ['USD', 'GBP', 'CAD', 'AUD', 'EUR'] },
  es: { default: 'EUR', options: ['EUR', 'MXN', 'USD'] },
  fr: { default: 'EUR', options: ['EUR', 'CAD', 'CHF', 'USD'] },
  ar: { default: 'SAR', options: ['SAR', 'AED', 'EGP', 'QAR', 'USD'] },
  zh: { default: 'CNY', options: ['CNY', 'HKD', 'TWD', 'USD'] },
  ru: { default: 'RUB', options: ['RUB', 'USD', 'EUR'] },
};

/**
 * Derives default currency from locale string (e.g. 'es' -> 'EUR').
 */
export function defaultCurrencyForLocale(locale: string): CurrencyCode {
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CURRENCIES[lang]?.default ?? 'USD';
}

/**
 * Returns currency options available for a specific locale.
 */
export function currencyOptionsForLocale(locale: string): CurrencyCode[] {
  const lang = locale.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CURRENCIES[lang]?.options ?? ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
}

/**
 * Converts a base USD amount to target currency.
 */
export function convertFromUsd(amountUsd: number, currency: CurrencyCode): number {
  if (!isFinite(amountUsd) || isNaN(amountUsd)) return 0;
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  return amountUsd * cfg.ratePerUsd;
}

/**
 * Formats a base USD amount directly into the localized target currency string.
 */
export function formatCurrencyFromUsd(amountUsd: number, currency: CurrencyCode, fractionDigits = 2): string {
  if (!isFinite(amountUsd) || isNaN(amountUsd)) return '--';
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  const converted = amountUsd * cfg.ratePerUsd;
  const formattedNum = converted.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  if (cfg.symbolPosition === 'suffix') {
    return `${formattedNum} ${cfg.symbol}`;
  }
  return `${cfg.symbol}${formattedNum}`;
}
