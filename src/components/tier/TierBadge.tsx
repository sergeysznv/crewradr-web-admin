'use client';

import { useTier } from '@/hooks/useTier';
import { hasMinTier, tierLabel } from '@/lib/tier';
import type { CrewTier } from '@/types/tier';

interface TierBadgeProps {
  requiredTier: CrewTier;
  compact?: boolean;
}

export function TierBadge({ requiredTier, compact = false }: TierBadgeProps) {
  const { tier } = useTier();

  if (hasMinTier(tier, requiredTier)) {
    return null;
  }

  if (compact) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-primary-container p-1"
        title={`Requires ${tierLabel(requiredTier)}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-on-primary-container">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-outline bg-primary-container px-2 py-0.5 text-[11px] font-bold text-on-primary-container">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
      </svg>
      {tierLabel(requiredTier)}
    </span>
  );
}
