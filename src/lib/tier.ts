import type { CrewTier } from '@/types/tier';

export const TIER_RANKS: Record<CrewTier, number> = {
  deckhand: 1,
  firstMate: 2,
  captain: 3,
  admiral: 4,
};

export function hasMinTier(currentTier: CrewTier, minTier: CrewTier): boolean {
  return (TIER_RANKS[currentTier] ?? 1) >= (TIER_RANKS[minTier] ?? 1);
}

export function tierLabel(tier: CrewTier): string {
  const labels: Record<CrewTier, string> = {
    deckhand: 'Deckhand',
    firstMate: 'First Mate',
    captain: 'Captain',
    admiral: 'Admiral',
  };
  return labels[tier];
}

export function tierHistoryDays(tier: CrewTier): number {
  const days: Record<CrewTier, number> = {
    deckhand: 7,
    firstMate: 30,
    captain: 90,
    admiral: 365,
  };
  return days[tier];
}

export function clampDaysByTier(requestedDays: number, tier: CrewTier): number {
  return Math.min(requestedDays, tierHistoryDays(tier));
}

export function effectiveHistoryDays(
  tier: CrewTier,
  retentionPolicyDays: number | null
): number {
  const tierDays = tierHistoryDays(tier);
  if (retentionPolicyDays === null || retentionPolicyDays === undefined) return tierDays;
  return Math.min(tierDays, retentionPolicyDays);
}
