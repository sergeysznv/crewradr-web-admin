// src/app/(dashboard)/reports/page.tsx
'use client';

import { useT } from '@/hooks/use-translations';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { ExportPresets } from '@/components/reports/ExportPresets';
import { ReportBuilder } from '@/components/reports/ReportBuilder';

export default function ReportsPage() {
  const { t } = useT();

  return (
    <div className="space-y-lg">
      <h1 className="text-xl font-bold text-on-surface">{t('webReportsTitle')}</h1>

      <ExportPresets />

      {/* Captain+: Report Builder */}
      <TierGateGuard minTier="captain" fallback={null}>
        <section className="space-y-md">
          <div>
            <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsBuilderTitle')}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsBuilderDesc')}</p>
          </div>
          <ReportBuilder />
        </section>
      </TierGateGuard>

      {/* Admiral: Scheduled Reports — placeholder for Phase 5 */}
      <TierGateGuard minTier="admiral" fallback={null}>
        <div className="rounded-lg border border-outline bg-surface p-6">
          <p className="text-sm text-on-surface-variant">{t('webReportsScheduledPlaceholder')}</p>
        </div>
      </TierGateGuard>
    </div>
  );
}
