import { describe, it, expect } from 'vitest';
import { hasMinTier, tierHistoryDays, clampDaysByTier, effectiveHistoryDays } from '@/lib/tier';
import { tierRank, tierLabel, tierColor } from '@/lib/utils';
import { normalizeTier } from '@/hooks/useTier';
import type { CrewTier } from '@/types/tier';

const TIERS: CrewTier[] = ['deckhand', 'firstMate', 'captain', 'admiral'];

describe('tier ordering', () => {
  it('hasMinTier is a total order over the four tiers', () => {
    TIERS.forEach((a, i) => {
      TIERS.forEach((b, j) => {
        expect(hasMinTier(a, b)).toBe(i >= j);
      });
    });
  });

  it('utils.tierRank agrees with hasMinTier for both spellings', () => {
    expect(tierRank('deckhand')).toBe(0);
    expect(tierRank('first_mate')).toBe(1);
    expect(tierRank('firstMate')).toBe(1);
    expect(tierRank('captain')).toBe(2);
    expect(tierRank('admiral')).toBe(3);
    expect(tierRank('something-else')).toBe(0);
  });

  it('first_mate and firstMate render identically', () => {
    expect(tierColor('first_mate')).toBe(tierColor('firstMate'));
    const t = (k: string) => k;
    expect(tierLabel('first_mate', t)).toBe(tierLabel('firstMate', t));
  });
});

describe('server/client spelling boundary', () => {
  it('normalizeTier maps snake_case server values to camelCase', () => {
    expect(normalizeTier('first_mate')).toBe('firstMate');
    expect(normalizeTier('captain')).toBe('captain');
    expect(normalizeTier('admiral')).toBe('admiral');
    expect(normalizeTier('deckhand')).toBe('deckhand');
  });

  it('normalizeTier fails to Deckhand on unknown / missing values', () => {
    expect(normalizeTier(undefined)).toBe('deckhand');
    expect(normalizeTier(null)).toBe('deckhand');
    expect(normalizeTier('shield')).toBe('deckhand');
  });
});

describe('history windows match mobile + server (7/30/90/365)', () => {
  it.each([
    ['deckhand', 7],
    ['firstMate', 30],
    ['captain', 90],
    ['admiral', 365],
  ] as const)('%s -> %i days', (tier, days) => {
    expect(tierHistoryDays(tier)).toBe(days);
  });

  it('clamps requests to the tier window', () => {
    expect(clampDaysByTier(400, 'admiral')).toBe(365);
    expect(clampDaysByTier(400, 'deckhand')).toBe(7);
  });

  it('a retention policy can only shorten, never extend, the window', () => {
    expect(effectiveHistoryDays('captain', 30)).toBe(30);
    expect(effectiveHistoryDays('captain', 999)).toBe(90);
    expect(effectiveHistoryDays('captain', null)).toBe(90);
  });
});
