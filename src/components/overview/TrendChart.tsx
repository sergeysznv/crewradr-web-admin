'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTier } from '@/hooks/useTier';
import { useSupabase } from '@/hooks/useSupabase';
import { useT, isImperial, getLocale } from '@/hooks/use-translations';
import { tierHistoryDays } from '@/lib/tier';
import { getWebTrendData, type TrendMetric } from '@/lib/rpc';

interface TrendChartProps {
  metric: TrendMetric;
  crewId: string;
  label: string;
  /** Override the tier-based history window. When omitted, falls back to settings.historyDays / tierHistoryDays. */
  days?: number;
}

export function TrendChart({ metric, crewId, label, days: daysOverride }: TrendChartProps) {
  const { t } = useT();
  const { settings, tier } = useTier();
  const supabase = useSupabase();
  // Prefer explicit override, then settings.historyDays, then tier ladder.
  const days = daysOverride ?? settings?.historyDays ?? tierHistoryDays(tier);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { data: points = [], isError, isLoading } = useQuery({
    queryKey: ['webTrendData', crewId, metric, days],
    queryFn: () => getWebTrendData(supabase, crewId, metric, days),
    enabled: !!crewId,
  });

  const imperial = isImperial();
  const isDistance = metric === 'miles';

  const unitLabel = isDistance
    ? (imperial ? 'mi' : 'km')
    : metric === 'hours'
      ? 'h'
      : t('webFleetAlertsLabel');

  // Apply distance conversion if metric system is active
  const pointsTransformed = points.map((p) => {
    let val = p.value;
    if (isDistance && !imperial) {
      val = p.value * 1.60934;
    }
    return { ...p, value: val };
  });

  const values = pointsTransformed.map((p) => p.value);
  const maxVal = Math.max(...values, 1);
  // Round max value up to nearest 5 or 1 for nice axis divisions
  const roundedMax = maxVal < 5 ? Math.ceil(maxVal) : Math.ceil(maxVal / 5) * 5;
  const lastValue = values.length > 0 ? values[values.length - 1] : null;

  // SVG dimensions matching SpeedGraph proportions for clean consistency
  const svgWidth = 1000;
  const svgHeight = 180;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // SVG coordinate projection
  const getX = (index: number) => {
    return paddingLeft + (index / Math.max(pointsTransformed.length - 1, 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + (1 - val / roundedMax) * chartHeight;
  };

  // Build the line & area path
  const linePoints = pointsTransformed.map((p, i) => `${getX(i).toFixed(1)},${getY(p.value).toFixed(1)}`);
  const linePath = linePoints.length > 0 ? `M ${linePoints.join(' L ')}` : '';
  const areaPath = linePoints.length > 0
    ? `${linePath} L ${getX(pointsTransformed.length - 1).toFixed(1)},${(paddingTop + chartHeight).toFixed(1)} L ${getX(0).toFixed(1)},${(paddingTop + chartHeight).toFixed(1)} Z`
    : '';

  const formatValue = (v: number): string => {
    return metric === 'alerts' ? String(Math.round(v)) : v.toFixed(1);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!containerRef.current || pointsTransformed.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentX = mouseX / rect.width;
    const index = Math.round(percentX * (pointsTransformed.length - 1));
    const clampedIndex = Math.max(0, Math.min(pointsTransformed.length - 1, index));
    setHoverIdx(clampedIndex);
  }

  // Ticks at 0%, 25%, 50%, 75%, 100% of max value
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const activePoint = hoverIdx !== null ? pointsTransformed[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? getX(hoverIdx) : 0;
  const hoverY = activePoint ? getY(activePoint.value) : 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl bg-surface border border-outline p-sz-md transition-all duration-200 hover:shadow-md select-none flex flex-col justify-between"
      style={{ minHeight: svgHeight + 70 }}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">{label}</span>
          <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-full">
            {t('webOverviewTrendDays', { days })}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-on-surface leading-none">
            {isError ? (
              <span className="text-xs text-error">{t('webErrorLoading')}</span>
            ) : isLoading ? (
              <span className="text-xs text-on-surface-variant animate-pulse">{t('loading')}</span>
            ) : lastValue !== null ? (
              formatValue(lastValue)
            ) : (
              '—'
            )}
          </span>
          {lastValue !== null && unitLabel && (
            <span className="text-xs font-semibold text-on-surface-variant">{unitLabel}</span>
          )}
        </div>
      </div>

      {pointsTransformed.length >= 2 ? (
        <div className="relative mt-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={`trendAreaGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((tick, i) => {
              const yVal = roundedMax * tick;
              const yPos = paddingTop + (1 - tick) * chartHeight;
              return (
                <g key={i} className="opacity-60">
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={paddingLeft + chartWidth}
                    y2={yPos}
                    className="stroke-outline/10"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? '0' : '4 4'}
                  />
                  <text
                    x={paddingLeft - 10}
                    y={yPos + 3.5}
                    textAnchor="end"
                    className="fill-on-surface-variant font-mono text-[9px]"
                  >
                    {formatValue(yVal)}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Ticks (Dates at start, middle, and end) */}
            {pointsTransformed.length > 1 && (
              <>
                <text
                  x={paddingLeft}
                  y={svgHeight - 6}
                  textAnchor="start"
                  className="fill-on-surface-variant font-medium text-[9px]"
                >
                  {formatDate(pointsTransformed[0].date)}
                </text>
                <text
                  x={paddingLeft + chartWidth / 2}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="fill-on-surface-variant font-medium text-[9px]"
                >
                  {formatDate(pointsTransformed[Math.floor(pointsTransformed.length / 2)].date)}
                </text>
                <text
                  x={paddingLeft + chartWidth}
                  y={svgHeight - 6}
                  textAnchor="end"
                  className="fill-on-surface-variant font-medium text-[9px]"
                >
                  {formatDate(pointsTransformed[pointsTransformed.length - 1].date)}
                </text>
              </>
            )}

            {/* Area under the trend line */}
            <path d={areaPath} fill={`url(#trendAreaGrad-${metric})`} className="transition-all duration-300" />

            {/* Trend line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />

            {/* Hover details pulse dot & guides */}
            {activePoint && (
              <g>
                <line
                  x1={hoverX}
                  y1={paddingTop}
                  x2={hoverX}
                  y2={paddingTop + chartHeight}
                  className="stroke-primary/30"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle cx={hoverX} cy={hoverY} r="5" className="fill-primary stroke-surface" strokeWidth="2" />
                <circle cx={hoverX} cy={hoverY} r="10" className="fill-primary/10 stroke-none animate-pulse" />
              </g>
            )}
          </svg>

          {/* Floating Tooltip */}
          {activePoint && (
            <div
              className="absolute z-10 pointer-events-none rounded-lg border border-outline bg-surface-container-high px-2.5 py-1.5 text-[11px] shadow-xl transition-all duration-75 text-left"
              style={{
                left: `${(hoverX / svgWidth) * 100}%`,
                top: `${(hoverY / svgHeight) * 100 - 10}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="font-semibold text-on-surface">
                {formatValue(activePoint.value)} {unitLabel}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[9px] text-on-surface-variant font-medium">
                {formatDate(activePoint.date)}
              </div>
            </div>
          )}
        </div>
      ) : (
        !isLoading && (
          <div className="text-center py-6">
            <span className="text-xs text-on-surface-variant">{t('webTrendNoData')}</span>
          </div>
        )
      )}
    </div>
  );
}
