import { describe, it, expect } from 'vitest';
import {
  normalizeTier,
  tierMaxCapacity,
  tierHistoryDays,
  clampDaysByTier,
  hasMinTier,
  effectiveHistoryDays,
  TIER_RANKS,
} from '@/lib/tier';
import { tierRank, tierColor } from '@/lib/utils';

describe('Tier system harmonization', () => {
  it('normalizes snake_case, camelCase, and legacy tier names', () => {
    expect(normalizeTier('deckhand')).toBe('deckhand');
    expect(normalizeTier('free')).toBe('deckhand');

    expect(normalizeTier('first_mate')).toBe('firstMate');
    expect(normalizeTier('firstMate')).toBe('firstMate');
    expect(normalizeTier('shield')).toBe('firstMate');
    expect(normalizeTier('premium')).toBe('firstMate');

    expect(normalizeTier('captain')).toBe('captain');
    expect(normalizeTier('command')).toBe('captain');
    expect(normalizeTier('gold')).toBe('captain');

    expect(normalizeTier('admiral')).toBe('admiral');
    expect(normalizeTier('enterprise')).toBe('admiral');

    expect(normalizeTier(null)).toBe('deckhand');
    expect(normalizeTier(undefined)).toBe('deckhand');
    expect(normalizeTier('unknown_tier')).toBe('deckhand');
  });

  it('reports exact capacity limits matching mobile and database', () => {
    expect(tierMaxCapacity('deckhand')).toBe(6);
    expect(tierMaxCapacity('firstMate')).toBe(15);
    expect(tierMaxCapacity('first_mate')).toBe(15);
    expect(tierMaxCapacity('captain')).toBe(25);
    expect(tierMaxCapacity('command')).toBe(25);
    expect(tierMaxCapacity('admiral')).toBe(-1); // unlimited
  });

  it('computes tierRank consistently regardless of casing', () => {
    expect(tierRank('deckhand')).toBe(0);
    expect(tierRank('free')).toBe(0);

    expect(tierRank('first_mate')).toBe(1);
    expect(tierRank('firstMate')).toBe(1);
    expect(tierRank('shield')).toBe(1);

    expect(tierRank('captain')).toBe(2);
    expect(tierRank('command')).toBe(2);

    expect(tierRank('admiral')).toBe(3);
    expect(tierRank('enterprise')).toBe(3);
  });

  it('evaluates hasMinTier correctly across camelCase and ranks', () => {
    expect(hasMinTier('deckhand', 'deckhand')).toBe(true);
    expect(hasMinTier('deckhand', 'firstMate')).toBe(false);
    expect(hasMinTier('firstMate', 'deckhand')).toBe(true);
    expect(hasMinTier('firstMate', 'firstMate')).toBe(true);
    expect(hasMinTier('firstMate', 'captain')).toBe(false);
    expect(hasMinTier('captain', 'firstMate')).toBe(true);
    expect(hasMinTier('admiral', 'captain')).toBe(true);
  });

  it('clamps history days correctly', () => {
    expect(tierHistoryDays('deckhand')).toBe(7);
    expect(tierHistoryDays('firstMate')).toBe(30);
    expect(tierHistoryDays('captain')).toBe(90);
    expect(tierHistoryDays('admiral')).toBe(365);

    expect(clampDaysByTier(100, 'firstMate')).toBe(30);
    expect(clampDaysByTier(15, 'firstMate')).toBe(15);
    expect(effectiveHistoryDays('firstMate', 14)).toBe(14);
    expect(effectiveHistoryDays('firstMate', 45)).toBe(30);
  });

  it('returns valid brand colors for each tier', () => {
    expect(tierColor('deckhand')).toBe('#6B7280');
    expect(tierColor('firstMate')).toBe('#4A90D9');
    expect(tierColor('first_mate')).toBe('#4A90D9');
    expect(tierColor('captain')).toBe('#D4A017');
    expect(tierColor('admiral')).toBe('#7B2FBE');
  });
});
