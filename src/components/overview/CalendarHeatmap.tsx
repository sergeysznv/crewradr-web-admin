'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { getWebTrendData } from '@/lib/rpc';

interface DayCell {
  date: string;
  activeHours: number;
}

const WEEK_DAYS = 7;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekdayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
}

function getIntensity(activeHours: number): string {
  if (activeHours === 0) return 'bg-surface-container';
  if (activeHours < 2) return 'bg-primary-container';
  if (activeHours < 5) return 'bg-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-surface))]';
  if (activeHours < 10) return 'bg-[color-mix(in_srgb,var(--color-primary)_70%,var(--color-surface))]';
  return 'bg-primary';
}

export function CalendarHeatmap({ crewId }: { crewId: string }) {
  const { t } = useT();
  const supabase = useSupabase();

  // The trend RPC returns (p_days + 1) points (start day through today);
  // keep the trailing week so the "This Week" grid aligns with today.
  const { data: rawPoints = [], isError } = useQuery({
    queryKey: ['webTrendData', crewId, 'hours', WEEK_DAYS],
    queryFn: () => getWebTrendData(supabase, crewId, 'hours', WEEK_DAYS),
    enabled: !!crewId,
    select: (points) => points.slice(-WEEK_DAYS),
  });

  const data: DayCell[] = rawPoints.map((p) => ({
    date: p.date,
    activeHours: Math.round(p.value * 10) / 10,
  }));

  if (isError) {
    return (
      <div className="rounded-lg border border-outline bg-surface p-sz-lg text-center">
        <p className="text-xs text-error">{t('webErrorLoading')}</p>
      </div>
    );
  }

  if (data.length === 0 || data.every((d) => d.activeHours === 0)) {
    return (
      <div className="rounded-lg border border-outline bg-surface p-sz-lg text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-on-surface-variant">{t('webOverviewNoActivity')}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{t('webOverviewNoActivityDesc')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-outline bg-surface p-sz-lg">
      <h3 className="mb-3 text-sm font-bold text-on-surface">{t('webOverviewThisWeek')}</h3>
      <div className="grid grid-cols-7 gap-1">
        {data.map((cell) => (
          <div
            key={`header-${cell.date}`}
            className="text-center text-[10px] font-semibold uppercase text-on-surface-variant"
            aria-hidden="true"
          >
            {getWeekdayLabel(cell.date)}
          </div>
        ))}
        {data.map((cell, i) => (
          <div
            key={i}
            className={`aspect-square rounded-md ${getIntensity(cell.activeHours)}`}
            title={t('webOverviewDayTooltip', { date: cell.date, hours: cell.activeHours })}
            aria-label={t('webOverviewDayTooltip', { date: cell.date, hours: cell.activeHours })}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[9px] text-on-surface-variant">
        <span>{t('webOverviewLess')}</span>
        <div className="h-3 w-3 rounded bg-surface-container" />
        <div className="h-3 w-3 rounded bg-primary-container" />
        <div className="h-3 w-3 rounded bg-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-surface))]" />
        <div className="h-3 w-3 rounded bg-[color-mix(in_srgb,var(--color-primary)_70%,var(--color-surface))]" />
        <div className="h-3 w-3 rounded bg-primary" />
        <span>{t('webOverviewMore')}</span>
      </div>
    </div>
  );
}
