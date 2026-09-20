// src/lib/__tests__/jurisdiction.test.ts
import { describe, it, expect } from 'vitest';
import { getEffectiveJurisdiction } from '../jurisdiction';

describe('jurisdiction', () => {
  it('identifies US jurisdiction when preference is explicitly US', () => {
    expect(getEffectiveJurisdiction('US', 'EUR', 'fr-FR')).toBe('US');
  });

  it('identifies INTL jurisdiction when preference is explicitly INTL', () => {
    expect(getEffectiveJurisdiction('INTL', 'USD', 'en-US')).toBe('INTL');
  });

  it('auto-detects INTL when currency is non-USD', () => {
    expect(getEffectiveJurisdiction('auto', 'EUR', 'es')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'GBP', 'en-GB')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'CAD', 'en')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'SAR', 'ar')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'CNY', 'zh')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'RUB', 'ru')).toBe('INTL');
  });

  it('auto-detects US when currency is USD and locale is US or generic English', () => {
    expect(getEffectiveJurisdiction('auto', 'USD', 'en-US')).toBe('US');
    expect(getEffectiveJurisdiction('auto', 'USD', 'en')).toBe('US');
    expect(getEffectiveJurisdiction('auto', 'USD', 'es')).toBe('US');
  });

  it('auto-detects INTL when locale specifies non-US country even if currency is USD', () => {
    expect(getEffectiveJurisdiction('auto', 'USD', 'en-GB')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'USD', 'es-MX')).toBe('INTL');
    expect(getEffectiveJurisdiction('auto', 'USD', 'fr-FR')).toBe('INTL');
  });
});
