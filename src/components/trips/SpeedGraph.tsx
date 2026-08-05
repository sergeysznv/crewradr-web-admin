// src/components/trips/SpeedGraph.tsx
'use client';

import { useT } from '@/hooks/use-translations';

export interface SpeedSample {
  timestamp: string;
  speedMph: number;
}

export function SpeedGraph({ samples, height = 160 }: { samples: SpeedSample[]; height?: number }) {
  const { t } = useT();

  if (samples.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-surface-container p-6" style={{ height }}>
        <p className="text-sm text-on-surface-variant">{t('webTripsNoSpeedData')}</p>
      </div>
    );
  }

  const maxSpeed = Math.max(...samples.map((s) => s.speedMph), 1);
  const width = 100;
  const points = samples
    .map((s, i) => {
      const x = (i / Math.max(samples.length - 1, 1)) * width;
      const y = (1 - s.speedMph / maxSpeed) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full rounded-xl bg-surface-container"
      preserveAspectRatio="none"
      role="img"
      aria-label={t('webTripsSpeed')}
    >
      <polyline
        points={points}
        fill="none"
        className="stroke-primary"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
