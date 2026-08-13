'use client';

import { useT } from '@/hooks/use-translations';
import { useTier } from '@/hooks/useTier';
import { useRiskPredictions } from '@/hooks/queries/useRiskPredictions';
import { AICard } from './AICard';
import { Info } from 'lucide-react';

export function RiskPredictionCard({ memberId }: { memberId: string }) {
  const { t } = useT();
  const { settings } = useTier();
  const crewId = settings?.crewId ?? null;

  const { data: predictions = [], isLoading, error } = useRiskPredictions(crewId);

  const pred = predictions.find(p => p.memberId === memberId);
  const serviceDown = !!error;

  return (
    <AICard isLoading={isLoading} serviceDown={serviceDown}>
      {pred ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
              {t('webAiRiskPredictionTitle')}
              <span title={t('webAiRiskTooltip')} className="cursor-help">
                <Info className="ml-1 inline-block h-3 w-3 text-on-surface-variant" />
              </span>
            </span>
            <span className="text-[10px] text-on-surface-variant">
              {t('webAiRiskConfidence', { pct: Math.round(pred.confidence * 100) })}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold leading-none ${
                pred.riskScore > 0.7
                  ? 'text-error'
                  : pred.riskScore > 0.4
                    ? 'text-warning'
                    : 'text-success'
              }`}
            >
              {Math.round(pred.riskScore * 100)}%
            </span>
            <span className="text-xs text-on-surface-variant">{t('webAiRiskIncidentToday')}</span>
          </div>
          <div className="mt-3 space-y-1">
            {pred.factors.slice(0, 3).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-on-surface-variant"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/30" />
                {f.description}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-on-surface-variant">{t('webAiRiskNoData')}</p>
      )}
    </AICard>
  );
}
