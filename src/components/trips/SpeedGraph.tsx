// src/components/trips/SpeedGraph.tsx
'use client';

import { useState, useRef } from 'react';
import { useT, isImperial } from '@/hooks/use-translations';

export interface SpeedSample {
  timestamp: string;
  speedMph: number;
}

export function SpeedGraph({ samples, height = 240 }: { samples: SpeedSample[]; height?: number }) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!samples || samples.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-surface-container p-6" style={{ height }}>
        <p className="text-sm text-on-surface-variant">{t('webTripsNoSpeedData')}</p>
      </div>
    );
  }

  // Unit settings
  const imperial = isImperial();
  const speedUnit = imperial ? 'mph' : 'km/h';
  const speedMultiplier = imperial ? 1 : 1.60934;

  // Find max speed in the appropriate unit system
  const maxSpeedVal = Math.max(...samples.map((s) => s.speedMph * speedMultiplier), 1);
  // Round up to the nearest multiple of 10 or 5 for nice axis ticks
  const roundedMaxSpeed = Math.max(10, Math.ceil(maxSpeedVal / 10) * 10);

  // SVG dimensions
  const svgWidth = 1000;
  const svgHeight = height;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Helper to get X and Y coordinates inside SVG system
  const getX = (index: number) => {
    return paddingLeft + (index / Math.max(samples.length - 1, 1)) * chartWidth;
  };

  const getY = (speedMph: number) => {
    const val = speedMph * speedMultiplier;
    return paddingTop + (1 - val / roundedMaxSpeed) * chartHeight;
  };

  // Build the line & area path
  const linePoints = samples.map((s, i) => `${getX(i).toFixed(1)},${getY(s.speedMph).toFixed(1)}`);
  const linePath = linePoints.length > 0 ? `M ${linePoints.join(' L ')}` : '';
  const areaPath = linePoints.length > 0
    ? `${linePath} L ${getX(samples.length - 1).toFixed(1)},${(paddingTop + chartHeight).toFixed(1)} L ${getX(0).toFixed(1)},${(paddingTop + chartHeight).toFixed(1)} Z`
    : '';

  // Time formatter helpers
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Grid line calculations
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Mouse event handlers for interactive tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentX = mouseX / rect.width;
    
    // Map mouse position to sample index
    const index = Math.round(percentX * (samples.length - 1));
    const clampedIndex = Math.max(0, Math.min(samples.length - 1, index));
    setHoverIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Active hover sample details
  const activeSample = hoverIndex !== null ? samples[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? getX(hoverIndex) : 0;
  const hoverY = activeSample ? getY(activeSample.speedMph) : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-outline/40 bg-surface-container/30 p-sz-md"
      style={{ minHeight: height + 50 }}
    >
      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full select-none overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Subtle primary fill gradient below the line */}
          <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines & Y-Axis Labels */}
        {yTicks.map((tick, i) => {
          const yVal = roundedMaxSpeed * tick;
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
                y={yPos + 4}
                textAnchor="end"
                className="fill-on-surface-variant font-mono text-[10px]"
              >
                {Math.round(yVal)} {speedUnit}
              </text>
            </g>
          );
        })}

        {/* X-Axis Ticks (Time labels at start, middle, and end) */}
        {samples.length > 1 && (
          <>
            {/* Start point */}
            <text
              x={paddingLeft}
              y={svgHeight - 12}
              textAnchor="start"
              className="fill-on-surface-variant text-[10px]"
            >
              {formatTime(samples[0].timestamp)}
            </text>

            {/* Middle point */}
            <text
              x={paddingLeft + chartWidth / 2}
              y={svgHeight - 12}
              textAnchor="middle"
              className="fill-on-surface-variant text-[10px]"
            >
              {formatTime(samples[Math.floor(samples.length / 2)].timestamp)}
            </text>

            {/* End point */}
            <text
              x={paddingLeft + chartWidth}
              y={svgHeight - 12}
              textAnchor="end"
              className="fill-on-surface-variant text-[10px]"
            >
              {formatTime(samples[samples.length - 1].timestamp)}
            </text>
          </>
        )}

        {/* Chart Area Fill */}
        <path d={areaPath} fill="url(#speedAreaGrad)" className="transition-all duration-300" />

        {/* Chart Line */}
        <path
          d={linePath}
          fill="none"
          className="stroke-primary transition-all duration-300"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Hover Guides & Focus Dot */}
        {activeSample && (
          <g>
            {/* Vertical Line */}
            <line
              x1={hoverX}
              y1={paddingTop}
              x2={hoverX}
              y2={paddingTop + chartHeight}
              className="stroke-primary/30"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Snap point circle */}
            <circle
              cx={hoverX}
              cy={hoverY}
              r="6"
              className="fill-primary stroke-surface"
              strokeWidth="2.5"
            />
            {/* Inner pulse circle */}
            <circle
              cx={hoverX}
              cy={hoverY}
              r="12"
              className="fill-primary/10 stroke-none animate-pulse"
            />
          </g>
        )}
      </svg>

      {/* Floating HTML Tooltip */}
      {activeSample && (
        <div
          className="absolute z-10 hidden pointer-events-none rounded-lg border border-outline bg-surface-container-high px-3 py-2 text-xs shadow-xl transition-all duration-75 md:block"
          style={{
            left: `${(hoverX / svgWidth) * 100}%`,
            top: `${(hoverY / svgHeight) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-on-surface">
            {Math.round(activeSample.speedMph * speedMultiplier)} {speedUnit}
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[10px] text-on-surface-variant">
            {formatTime(activeSample.timestamp)}
          </div>
          <div className="mt-0.5 text-[9px] opacity-60">
            {formatDate(activeSample.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
}
