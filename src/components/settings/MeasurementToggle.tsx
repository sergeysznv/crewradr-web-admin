// src/components/settings/MeasurementToggle.tsx
'use client';

import { Ruler } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import type { MeasurementSystem } from '@/lib/units';

export function MeasurementToggle() {
  const { t } = useT();
  const { system, setAndSync } = useMeasurementSystem();

  return (
    <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-on-surface">{t('webMeasurementSystemTitle')}</h2>
      </div>
      <p className="mb-4 text-sm text-on-surface-variant">{t('webMeasurementSystemDesc')}</p>
      <label htmlFor="measurement-system" className="sr-only">{t('webMeasurementSystemTitle')}</label>
      <select
        id="measurement-system"
        value={system}
        onChange={(e) => setAndSync(e.target.value as MeasurementSystem)}
        className="w-full sm:w-64 rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
      >
        <option value="metric">{t('webMeasurementMetric')}</option>
        <option value="imperial">{t('webMeasurementImperial')}</option>
      </select>
    </div>
  );
}
