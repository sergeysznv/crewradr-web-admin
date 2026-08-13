'use client';

import { useTier } from '@/hooks/useTier';
import { useT } from '@/hooks/use-translations';

export function LockoutBanner() {
  const { isInLockout } = useTier();
  const { t } = useT();

  if (!isInLockout) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-error px-6 py-2.5 text-on-error">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <span className="text-sm font-semibold">
          {t('webLockoutMessage')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a href="/members" className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-on-error hover:bg-black/35">
          {t('webLockoutManage')}
        </a>
        <a href="/settings" className="rounded-full bg-black/15 px-3 py-1 text-xs font-bold text-on-error hover:bg-black/25">
          {t('webLockoutUpgrade')}
        </a>
      </div>
    </div>
  );
}
