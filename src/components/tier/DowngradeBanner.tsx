'use client';

import { useTier } from '@/hooks/useTier';
import { tierLabel } from '@/lib/tier';
import { useT } from '@/hooks/use-translations';

export function DowngradeBanner() {
  const { graceDaysRemaining, pendingDowngradeTier, isOverCapacity } = useTier();
  const { t } = useT();

  if (graceDaysRemaining <= 0 || !pendingDowngradeTier) return null;

  const excessMembers = isOverCapacity ? t('webDowngradeExcessMembers') : '';

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-warning/95 px-6 py-2.5 text-white">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
        <span className="text-sm font-semibold">
          {t('webDowngradeCountdown', {
            tier: tierLabel(pendingDowngradeTier),
            days: graceDaysRemaining,
            plural: graceDaysRemaining !== 1 ? 's' : '',
          })}
        </span>
        <span className="text-xs opacity-80">{excessMembers}</span>
      </div>
      <div className="flex items-center gap-2">
        <a href="/members" className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold transition-colors hover:bg-white/30">
          {t('webDowngradeManageMembers')}
        </a>
        <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold transition-colors hover:bg-white/20">
          {t('webDowngradeViewChanges')}
        </button>
      </div>
    </div>
  );
}
