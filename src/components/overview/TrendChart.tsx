'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTier } from '@/hooks/useTier';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { tierHistoryDays } from '@/lib/tier';
import { getWebTrendData, type TrendMetric } from '@/lib/rpc';

interface TrendChartProps {
  metric: TrendMetric;
  crewId: string;
  label: string;
  /** Override the tier-based history window. When omitted, falls back to settings.historyDays / tierHistoryDays. */
  days?: number;
}

const CHART_W = 100;
const CHART_H = 120;

export function TrendChart({ metric, crewId, label, days: daysOverride }: TrendChartProps) {
  const { t } = useT();
  const { settings, tier } = useTier();
  const supabase = useSupabase();
  // Prefer explicit override, then settings.historyDays, then tier ladder.
  const days = daysOverride ?? settings?.historyDays ?? tierHistoryDays(tier);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { data: points = [], isError } = useQuery({
    queryKey: ['webTrendData', crewId, metric, days],
    queryFn: () => getWebTrendData(supabase, crewId, metric, days),
    enabled: !!crewId,
  });

  const values = points.map((p) => p.value);
  const maxVal = Math.max(...values, 1);
  const lastValue = values.length > 0 ? values[values.length - 1] : null;

  const linePath = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * CHART_W;
      const y = (1 - p.value / maxVal) * CHART_H;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  const areaPath = linePath ? `${linePath}L${CHART_W},${CHART_H}L0,${CHART_H}Z` : '';

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const ratio = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.round((ratio / CHART_W) * (points.length - 1));
    setHoverIdx(Math.min(Math.max(idx, 0), points.length - 1));
  }

  function formatValue(v: number): string {
    return metric === 'alerts' ? String(Math.round(v)) : v.toFixed(1);
  }

  return (
    <div className="rounded-lg bg-surface border border-outline p-sz-lg">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">{label}</span>
        <span className="text-[10px] text-on-surface-variant">{t('webOverviewTrendDays', { days })}</span>
      </div>
      <div className="mt-1">
        <span className="text-2xl font-extrabold text-on-surface">
          {isError ? <span className="text-xs text-error">{t('webErrorLoading')}</span> : lastValue !== null ? formatValue(lastValue) : '—'}
        </span>
      </div>
      {points.length >= 2 ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="mt-2 w-full touch-none"
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={`${label}, ${formatValue(lastValue ?? 0)}`}
        >
          <path d={areaPath} fill="var(--color-primary-container)" stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {hoverIdx !== null && points[hoverIdx] && (
            <g>
              <line
                x1={(hoverIdx / Math.max(points.length - 1, 1)) * CHART_W}
                y1={0}
                x2={(hoverIdx / Math.max(points.length - 1, 1)) * CHART_W}
                y2={CHART_H}
                stroke="var(--color-on-surface-variant)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 2"
              />
              <circle
                cx={(hoverIdx / Math.max(points.length - 1, 1)) * CHART_W}
                cy={(1 - points[hoverIdx].value / maxVal) * CHART_H}
                r="4"
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>
      ) : null}
      {hoverIdx !== null && points[hoverIdx] ? (
        <p className="mt-1 text-xs text-on-surface-variant">
          {points[hoverIdx].date}: {formatValue(points[hoverIdx].value)}
        </p>
      ) : null}
    </div>
  );
}
