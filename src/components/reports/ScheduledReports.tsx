// src/components/reports/ScheduledReports.tsx
'use client';

import { CalendarClock } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { TierGateGuard } from '@/components/tier/TierGateGuard';

/**
 * Scheduled Reports (Admiral) — coming soon.
 *
 * The backing `enterprise_scheduled_reports` table does not exist yet, so this
 * renders a tier-gated "coming soon" placeholder. Swap in the management UI
 * once the backend lands.
 */
export function ScheduledReports() {
  const { t } = useT();

  return (
    <TierGateGuard minTier="admiral" fallback={null}>
      <section className="space-y-md">
        <div>
          <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsScheduledTitle')}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsScheduledDesc')}</p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-outline bg-surface p-6">
          <CalendarClock
            className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant opacity-60"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-on-surface">{t('webReportsComingSoon')}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">{t('webReportsScheduledPlaceholder')}</p>
          </div>
        </div>
      </section>
    </TierGateGuard>
  );
}
