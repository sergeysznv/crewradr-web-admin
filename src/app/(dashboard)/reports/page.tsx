// src/app/(dashboard)/reports/page.tsx
'use client';

import { useT } from '@/hooks/use-translations';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { ExportPresets } from '@/components/reports/ExportPresets';

export default function ReportsPage() {
  const { t } = useT();

  return (
    <div className="space-y-lg">
      <h1 className="text-xl font-bold text-on-surface">{t('webReportsTitle')}</h1>

      <ExportPresets />

      {/* Captain+: Report Builder — placeholder for Phase 4 */}
      <TierGateGuard minTier="captain" fallback={null}>
        <div className="rounded-lg border border-outline bg-surface p-6">
          <p className="text-sm text-on-surface-variant">{t('webReportsBuilderPlaceholder')}</p>
        </div>
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
