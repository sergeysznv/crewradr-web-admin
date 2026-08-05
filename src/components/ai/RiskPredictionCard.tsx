'use client';

import { useTier } from '@/hooks/useTier';
import { useRiskPredictions } from '@/hooks/queries/useRiskPredictions';
import { AICard } from './AICard';

export function RiskPredictionCard({ memberId }: { memberId: string }) {
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
              Risk Prediction
            </span>
            <span className="text-[10px] text-on-surface-variant/60">
              {Math.round(pred.confidence * 100)}% confidence
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
            <span className="text-xs text-on-surface-variant">incident risk today</span>
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
        <p className="text-xs text-on-surface-variant">No risk data available for this member</p>
      )}
    </AICard>
  );
}
