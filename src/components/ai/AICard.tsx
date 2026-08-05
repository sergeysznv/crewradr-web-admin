'use client';

import { type ReactNode } from 'react';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { useT } from '@/hooks/use-translations';

interface AICardProps {
  children: ReactNode;
  isLoading?: boolean;
  serviceDown?: boolean;
}

export function AICard({ children, isLoading = false, serviceDown = false }: AICardProps) {
  const { t } = useT();
  return (
    <TierGateGuard minTier="admiral" fallback={null}>
      {isLoading ? (
        <div className="animate-pulse rounded-lg border border-outline bg-surface p-4">
          <div className="h-4 w-24 rounded-full bg-surface-container-highest/30" />
          <div className="mt-2 h-3 w-48 rounded-full bg-surface-container-highest/20" />
        </div>
      ) : serviceDown ? (
        <div className="rounded-lg border border-outline bg-surface p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
            <span className="text-xs text-on-surface-variant">{t('webAIServiceDown')}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-outline bg-surface p-4">{children}</div>
      )}
    </TierGateGuard>
  );
}
