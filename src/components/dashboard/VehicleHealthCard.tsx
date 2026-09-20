'use client';

import { useState } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { useT } from '@/hooks/use-translations';
import { useVehicleHealth } from '@/hooks/queries/useVehicleHealth';
import { useSupabase } from '@/hooks/useSupabase';
import { Wrench, CheckCircle2, AlertTriangle, BatteryCharging, ShieldAlert, Check } from 'lucide-react';
import { Skeleton } from '@/components/shared/Skeleton';

export function VehicleHealthCard() {
  const { crewId } = useCrew();
  const { t } = useT();
  const supabase = useSupabase();
  const { data, isLoading, refetch } = useVehicleHealth(crewId);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await supabase
        .from('safety_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      await refetch();
    } catch (e) {
      console.error('Failed to resolve vehicle fault alert:', e);
    } finally {
      setResolvingId(null);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />;
  }

  const faults = data?.faults ?? [];
  const hasIssues = faults.length > 0;

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-card p-sz-md shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">{t('webVehicleHealthTitle')}</h2>
            <p className="text-xs text-on-surface-variant">{t('webVehicleHealthSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
            {data?.cleanVehicles ?? 0} Clean Scans
          </span>
          {data?.crankingSagCount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <BatteryCharging className="h-3.5 w-3.5" /> {data.crankingSagCount} Battery Sags
            </span>
          ) : null}
          {data?.criticalCount ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" /> {data.criticalCount} Critical
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        {!hasIssues ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-3.5 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs">
              <p className="font-semibold">{t('webVehicleHealthClean')}</p>
              <p className="opacity-80 mt-0.5">Continuous OBD-II diagnostics indicate all powertrain, emissions, and 12V starter circuits are operating within factory tolerances.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {faults.map((f) => {
              const isCritical = f.severity === 'critical';
              return (
                <div
                  key={f.id}
                  className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl p-3 border text-xs transition-colors ${
                    isCritical
                      ? 'border-red-300 bg-red-500/5 dark:border-red-900/60 dark:bg-red-950/20'
                      : 'border-amber-300 bg-amber-500/5 dark:border-amber-900/60 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                        isCritical
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        {f.code}
                      </span>
                      <span className="font-semibold text-on-surface">{f.driverName}</span>
                      <span className={`font-medium capitalize px-2 py-0.5 rounded-full ${
                        isCritical
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {f.severity}
                      </span>
                      {f.crankingVoltage != null && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-700 dark:text-amber-400">
                          <BatteryCharging className="h-3 w-3" /> {f.crankingVoltage.toFixed(2)}V Sag
                        </span>
                      )}
                    </div>
                    <p className="text-on-surface-variant font-medium">{f.description}</p>
                    <p className="text-on-surface font-semibold">
                      <span className="text-on-surface-variant font-normal">{t('webVehicleHealthAction')} </span>
                      {f.recommendation}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolve(f.id)}
                    disabled={resolvingId === f.id}
                    className="inline-flex items-center gap-1 self-end sm:self-start rounded-lg border border-outline-variant/60 bg-surface px-2.5 py-1 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {resolvingId === f.id ? 'Clearing…' : 'Acknowledge'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
