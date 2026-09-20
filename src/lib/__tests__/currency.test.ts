import { describe, it, expect } from 'vitest';
import {
  defaultCurrencyForLocale,
  currencyOptionsForLocale,
  convertFromUsd,
  formatCurrencyFromUsd,
  CURRENCIES,
} from '@/lib/currency';

describe('Currency System', () => {
  describe('defaultCurrencyForLocale', () => {
    it('returns USD for English', () => {
      expect(defaultCurrencyForLocale('en')).toBe('USD');
      expect(defaultCurrencyForLocale('en-US')).toBe('USD');
    });

    it('returns EUR for Spanish and French', () => {
      expect(defaultCurrencyForLocale('es')).toBe('EUR');
      expect(defaultCurrencyForLocale('fr')).toBe('EUR');
    });

    it('returns SAR for Arabic', () => {
      expect(defaultCurrencyForLocale('ar')).toBe('SAR');
    });

    it('returns CNY for Chinese', () => {
      expect(defaultCurrencyForLocale('zh')).toBe('CNY');
    });

    it('returns RUB for Russian', () => {
      expect(defaultCurrencyForLocale('ru')).toBe('RUB');
    });

    it('falls back to USD for unknown locale', () => {
      expect(defaultCurrencyForLocale('xx')).toBe('USD');
    });
  });

  describe('currencyOptionsForLocale', () => {
    it('returns multiple options for Spanish (EUR, MXN, USD)', () => {
      const opts = currencyOptionsForLocale('es');
      expect(opts).toContain('EUR');
      expect(opts).toContain('MXN');
      expect(opts).toContain('USD');
    });

    it('returns multiple options for Arabic (SAR, AED, EGP, QAR, USD)', () => {
      const opts = currencyOptionsForLocale('ar');
      expect(opts).toContain('SAR');
      expect(opts).toContain('AED');
      expect(opts).toContain('USD');
    });

    it('returns multiple options for Chinese (CNY, HKD, TWD, USD)', () => {
      const opts = currencyOptionsForLocale('zh');
      expect(opts).toContain('CNY');
      expect(opts).toContain('HKD');
      expect(opts).toContain('USD');
    });
  });

  describe('convertFromUsd', () => {
    it('converts correctly based on exchange rate', () => {
      expect(convertFromUsd(100, 'USD')).toBe(100);
      expect(convertFromUsd(100, 'EUR')).toBeCloseTo(92, 1);
      expect(convertFromUsd(100, 'SAR')).toBeCloseTo(375, 1);
      expect(convertFromUsd(100, 'CNY')).toBeCloseTo(715, 1);
    });

    it('handles NaN and Infinity safely', () => {
      expect(convertFromUsd(NaN, 'USD')).toBe(0);
      expect(convertFromUsd(Infinity, 'EUR')).toBe(0);
    });
  });

  describe('formatCurrencyFromUsd', () => {
    it('formats prefix currencies correctly', () => {
      const formattedUsd = formatCurrencyFromUsd(50, 'USD');
      expect(formattedUsd).toContain('$');
      expect(formattedUsd).toContain('50.00');

      const formattedEur = formatCurrencyFromUsd(100, 'EUR');
      expect(formattedEur).toContain('€');
      expect(formattedEur).toContain('92.00');
    });

    it('formats suffix currencies correctly', () => {
      const formattedSar = formatCurrencyFromUsd(100, 'SAR');
      expect(formattedSar).toContain('﷼');

      const formattedRub = formatCurrencyFromUsd(100, 'RUB');
      expect(formattedRub).toContain('₽');
    });

    it('returns -- for NaN or non-finite values', () => {
      expect(formatCurrencyFromUsd(NaN, 'USD')).toBe('--');
      expect(formatCurrencyFromUsd(Infinity, 'EUR')).toBe('--');
    });
  });
});
