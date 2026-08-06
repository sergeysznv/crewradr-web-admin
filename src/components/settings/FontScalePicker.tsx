'use client';

import { Type } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import { useFontScale, FONT_SCALES, type FontScale } from '@/hooks/useFontScale';

const LABELS: Record<FontScale, string> = {
  0.8: 'webFontScaleSmall',
  1.0: 'webFontScaleDefault',
  1.2: 'webFontScaleMedium',
  1.4: 'webFontScaleLarge',
  1.6: 'webFontScaleXLarge',
};

export function FontScalePicker() {
  const { t } = useT();
  const { scale, setAndSync } = useFontScale();

  return (
    <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
      <div className="flex items-center gap-2 mb-4">
        <Type className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-on-surface">{t('webFontScaleTitle')}</h2>
      </div>
      <p className="mb-4 text-sm text-on-surface-variant">{t('webFontScaleDesc')}</p>
      <label htmlFor="font-scale" className="sr-only">{t('webFontScaleTitle')}</label>
      <select
        id="font-scale"
        value={scale}
        onChange={(e) => setAndSync(Number(e.target.value) as FontScale)}
        className="w-full sm:w-64 rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
        style={{ fontSize: `${scale * 100}%` }}
      >
        {FONT_SCALES.map((s) => (
          <option key={s} value={s}>
            {t(LABELS[s])} ({Math.round(s * 100)}%)
          </option>
        ))}
      </select>
    </div>
  );
}
