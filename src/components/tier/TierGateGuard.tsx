'use client';

import { type ReactNode } from 'react';
import { useTier } from '@/hooks/useTier';
import { hasMinTier } from '@/lib/tier';
import type { CrewTier } from '@/types/tier';

interface TierGateGuardProps {
  minTier?: CrewTier;
  requireFeature?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function TierGateGuard({
  minTier,
  requireFeature,
  children,
  fallback = null,
}: TierGateGuardProps) {
  const { tier, settings, isLoading } = useTier();

  // Loading: render skeleton to prevent flash-of-unauthorized
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-surface-container/50" style={{ height: 64 }}>
        <div className="h-full w-full rounded-2xl bg-surface-container-high/30" />
      </div>
    );
  }

  // Tier check
  if (minTier && !hasMinTier(tier, minTier)) {
    return <>{fallback}</>;
  }

  // Feature flag check
  if (requireFeature && settings?.features) {
    const featureValue = settings.features[requireFeature as keyof typeof settings.features];
    if (!featureValue) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
