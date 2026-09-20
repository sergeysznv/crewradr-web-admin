'use client';

import { useCrew } from '@/hooks/useCrew';
import { useT } from '@/hooks/use-translations';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { useCurrencyContext } from '@/components/settings/CurrencyProvider';
import { useFleetEcoRoi } from '@/hooks/queries/useFleetEcoRoi';
import { formatCarbonKg, formatFuelVolumeGallons } from '@/lib/units';
import { Leaf, DollarSign, Clock, Cloud, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/shared/Skeleton';
import { CurrencySelect } from '@/components/shared/CurrencySelect';

interface FleetRoiCardProps {
  days?: number;
}

export function FleetRoiCard({ days = 30 }: FleetRoiCardProps) {
  const { crewId } = useCrew();
  const { t } = useT();
  const { system } = useMeasurementSystem();
  const { formatMoney, currencyConfig } = useCurrencyContext();
  const { data, isLoading } = useFleetEcoRoi(crewId, days);

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />;
  }

  const ecoScore = data?.fleetEcoScore ?? 90;
  const idleHours = (data?.totalIdleHours ?? 0).toFixed(1);
  const wastedMoney = formatMoney(data?.wastedCostUsd ?? 0);
  const carbonStr = formatCarbonKg(data?.co2EmissionsKg ?? 0, system);
  const fuelBurnedStr = formatFuelVolumeGallons(data?.idleFuelGallons ?? 0, system);

  const scoreColor =
    ecoScore >= 85
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-300 dark:border-emerald-800'
      : ecoScore >= 70
      ? 'text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-300 dark:border-amber-800'
      : 'text-red-700 dark:text-red-400 bg-red-500/15 border-red-300 dark:border-red-800';

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-card p-sz-md shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Fleet ROI & SmartWay Eco-Driving</h2>
            <p className="text-xs text-on-surface-variant">Excessive idling reduction, EPA fuel burn, & carbon emissions</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-on-surface-variant font-medium">Currency:</span>
          <CurrencySelect className="h-8 rounded-lg border border-outline-variant/40 bg-surface px-2 text-xs font-semibold" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Eco Score Tile */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold text-lg ${scoreColor}`}>
            {ecoScore}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-on-surface-variant">{t('webFleetEcoScore')}</p>
            <p className="text-xs font-bold text-on-surface">
              {ecoScore >= 85 ? 'Optimal Efficiency' : ecoScore >= 70 ? 'Moderate Fuel Drag' : 'High Idle Burn'}
            </p>
          </div>
        </div>

        {/* Excessive Idling Hours Tile */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-on-surface-variant">{t('webFleetExcessiveIdling')}</p>
            <p className="text-base font-bold text-on-surface">{idleHours} hrs</p>
            <p className="text-[10px] text-on-surface-variant">&gt;3 min parked idle</p>
          </div>
        </div>

        {/* Wasted Cost Tile */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-on-surface-variant">{t('webFleetFuelWaste')}</p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">{wastedMoney}</p>
            <p className="text-[10px] text-on-surface-variant">{fuelBurnedStr} idle burn</p>
          </div>
        </div>

        {/* Carbon Footprint Tile */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <Cloud className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-on-surface-variant">{t('webFleetCarbonFootprint')}</p>
            <p className="text-base font-bold text-on-surface">{carbonStr}</p>
            <p className="text-[10px] text-on-surface-variant">EPA standard factor</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-container/60 p-2.5 text-xs text-on-surface-variant">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--brand-accent,#D4A017)]" />
        <span>
          <strong>SmartWay Tip:</strong> Shutting down fleet engines when parked for more than 3 minutes reduces starter wear, cylinder carbon build-up, and saves approx. 0.60 gal/hr in commercial fuel expenses.
        </span>
      </div>
    </div>
  );
}
