'use client';

import { CheckCircle2 } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useAnomalies } from '@/hooks/queries/useAnomalies';
import { AICard } from './AICard';
import type { AnomalySeverity } from '@/types/tier';

const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  low: 'border-l-success',
  medium: 'border-l-warning',
  high: 'border-l-error',
};

export function AnomalyCard() {
  const { t } = useT();
  const { settings, tier } = useTier();
  const crewId = settings?.crewId ?? null;
  const isAdmiral = tier === 'admiral';

  const { data: anomalies = [], isLoading, error } = useAnomalies(crewId, 30, isAdmiral);

  const recentAnomalies = anomalies.slice(0, 5);
  const serviceDown = !!error;

  return (
    <AICard isLoading={isLoading} serviceDown={serviceDown}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {t('webAiAnomaliesTitle')}
      </span>
      {recentAnomalies.length > 0 ? (
        <div className="mt-2 space-y-2">
          {recentAnomalies.map(a => (
            <div
              key={a.id}
              className={`rounded-lg border-l-2 bg-surface-container-highest/10 p-2 pl-3 ${SEVERITY_COLORS[a.severity]}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">{a.memberName}</span>
                <span className="text-[10px] text-on-surface-variant">
                  {new Date(a.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">{a.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success" />
          <span className="text-xs text-on-surface-variant">
            {t('webAiAnomaliesNone')}
          </span>
        </div>
      )}
    </AICard>
  );
}
