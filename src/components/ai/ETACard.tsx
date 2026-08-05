'use client';

import { AICard } from './AICard';

interface ETACardProps {
  memberId: string;
  memberName: string;
  destination: string;
  etaMinutes: number;
  confidence: number;
}

export function ETACard({ memberName, destination, etaMinutes, confidence }: ETACardProps) {
  return (
    <AICard>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
        Arrival Prediction
      </span>
      <div className="mt-1">
        <span className="text-base font-bold text-on-surface">{memberName}</span>
        <span className="text-xs text-on-surface-variant"> → {destination}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-primary">{etaMinutes}</span>
        <span className="text-sm text-on-surface-variant">min</span>
      </div>
      <p className="text-[10px] text-on-surface-variant/60">
        ±{Math.round((1 - confidence) * 100)}% margin
      </p>
    </AICard>
  );
}
