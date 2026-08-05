// src/app/(dashboard)/reports/page.tsx
'use client';

import { useT } from '@/hooks/use-translations';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';
import { ExportPresets } from '@/components/reports/ExportPresets';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ScheduledReports } from '@/components/reports/ScheduledReports';

export default function ReportsPage() {
  const { t } = useT();

  return (
    <div className="space-y-lg">
      <h1 className="text-xl font-bold text-on-surface">{t('webReportsTitle')}</h1>

      <ExportPresets />

      {/* Captain+ tier AND captain/co-captain role: Report Builder
          (save_report_template is role-gated server-side) */}
      <RoleGate>
        <TierGateGuard minTier="captain" fallback={null}>
          <section className="space-y-md">
            <div>
              <h2 className="font-heading text-base font-bold text-on-surface">{t('webReportsBuilderTitle')}</h2>
              <p className="mt-1 text-xs text-on-surface-variant">{t('webReportsBuilderDesc')}</p>
            </div>
            <ReportBuilder />
          </section>
        </TierGateGuard>
      </RoleGate>

      {/* Admiral: Scheduled Reports — coming soon (backend table not yet present) */}
      <ScheduledReports />
    </div>
  );
}
