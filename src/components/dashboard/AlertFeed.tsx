// src/components/dashboard/AlertFeed.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SeverityBadge, type Severity } from '@/components/shared/SeverityBadge';
import { useCrew } from '@/hooks/useCrew';
import { useResolveSafetyAlert } from '@/hooks/queries/useMutations';
import { CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Info, ArrowUpRight } from 'lucide-react';
import { useT } from '@/hooks/use-translations';
import type { FleetDashboard } from '@/types/rpc';

const SEVERITY_MAP: Record<string, Severity> = {
  critical: 'critical',
  warning: 'warning',
};

export function AlertFeed({ alerts }: { alerts: FleetDashboard['recent_alerts'] }) {
  const { t } = useT();

  return (
    <div className="bg-surface border border-outline rounded-lg p-sz-lg">
      <div className="font-heading font-bold text-sm text-on-surface mb-3">
        {t('webFleetRecentAlerts')}
      </div>
      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
        {alerts.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-sz-lg">
            {t('webFleetNoAlerts')}
          </p>
        )}
        {alerts.map((alert) => (
          <AlertFeedItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}

function getAlertExplanation(alertType: string): string {
  const type = alertType.toLowerCase();
  if (type.includes('fatigue')) {
    return 'Fatigue alerts indicate driving for extended hours or overnight without rest. Operating while fatigued poses significant collision risk.';
  }
  if (type.includes('speed')) {
    return 'Speeding alerts trigger when a vehicle exceeds the set speed threshold. High speed reduces driver reaction time and increases stopping distance.';
  }
  if (type.includes('weather') || type.includes('rain') || type.includes('snow')) {
    return 'Weather alerts signal adverse local weather conditions. Drivers should reduce speed and increase follow distance below standard thresholds.';
  }
  if (type.includes('braking') || type.includes('acceleration')) {
    return 'Harsh telemetry events (braking/acceleration) indicate aggressive driving or unexpected obstacles, which decrease fuel efficiency and safety scores.';
  }
  return 'Telemetry rule alert triggered by the mobile client. Review driver history to maintain compliance with the fleet safety policy.';
}

function AlertFeedItem({ alert }: { alert: FleetDashboard['recent_alerts'][number] }) {
  const { t } = useT();
  const { role, crewId } = useCrew();
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const resolveMutation = useResolveSafetyAlert(crewId!);
  const canResolve = role === 'captain' || role === 'co-captain' || role === 'cocaptain';

  const handleResolve = () => {
    resolveMutation.mutate(
      {
        alertId: alert.id,
        resolutionNotes: notes,
      },
      {
        onSuccess: () => {
          setIsResolving(false);
          setNotes('');
        },
      }
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid triggering navigation when clicking on inner form fields, buttons or textareas
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('textarea') ||
      target.closest('input')
    ) {
      return;
    }
    router.push('/compliance');
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer transition-all duration-200 hover:shadow hover:scale-[1.01] hover:brightness-95 active:scale-100 rounded-lg select-none"
    >
      <SeverityBadge
        severity={SEVERITY_MAP[alert.severity] ?? 'info'}
        label={alert.alert_type}
        subtitle={`${alert.display_name ?? t('webFleetUnknown') ?? 'Crew Member'} · ${new Date(
          alert.created_at
        ).toLocaleTimeString()}`}
      >
        {alert.message && (
          <p className="mt-1 text-xs text-on-surface-variant leading-snug">
            {alert.message}
          </p>
        )}

        {/* Resolution Status / Action row */}
        <div className="mt-2 pt-2 border-t border-dashed border-outline-variant/30 flex items-center justify-between gap-2 flex-wrap">
          {alert.resolved ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Resolved by {alert.resolved_by_name ?? 'Captain'}</span>
              {(alert.resolution_notes || alert.resolved_at) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="inline-flex items-center text-primary hover:underline ml-1"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-on-surface-variant/80 text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-amber-600">Unresolved</span>
              {canResolve && !isResolving && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsResolving(true);
                  }}
                  className="text-primary hover:underline font-semibold ml-2"
                >
                  Resolve Alert
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expanded Resolution Details */}
        {alert.resolved && expanded && (
          <div className="mt-2 p-2 bg-surface/50 border border-outline/30 rounded text-xs text-on-surface-variant animate-fade-in space-y-1">
            {alert.resolved_at && (
              <p>
                <span className="font-semibold">Resolved At:</span>{' '}
                {new Date(alert.resolved_at).toLocaleString()}
              </p>
            )}
            {alert.resolution_notes && (
              <p>
                <span className="font-semibold">Notes:</span> {alert.resolution_notes}
              </p>
            )}
          </div>
        )}

        {/* Inline Resolution Form */}
        {isResolving && (
          <div className="mt-3 p-2 bg-surface border border-outline rounded-lg space-y-2 animate-fade-in">
            <textarea
              className="w-full bg-surface text-xs text-on-surface border border-outline rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter resolution notes (e.g. contacted driver)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsResolving(false);
                  setNotes('');
                }}
                disabled={resolveMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="px-2.5 py-1 text-xs bg-primary text-on-primary hover:bg-primary/95 rounded font-semibold disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolve();
                }}
                disabled={resolveMutation.isPending || !notes.trim()}
              >
                {resolveMutation.isPending ? 'Saving...' : 'Resolve'}
              </button>
            </div>
          </div>
        )}
      </SeverityBadge>

      {/* Hover details tooltip */}
      {isHovered && !isResolving && (
        <div className="absolute z-30 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 p-4 bg-zinc-950 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 rounded-lg shadow-xl text-xs leading-normal animate-fade-in pointer-events-none">
          <div className="font-semibold mb-2 flex items-center gap-1.5 text-zinc-250 text-sm">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>{alert.alert_type} Details</span>
          </div>
          <div className="space-y-1.5 text-zinc-300 font-normal">
            <p>
              <span className="text-zinc-500">Occurred:</span>{' '}
              {new Date(alert.created_at).toLocaleString()}
            </p>
            <p>
              <span className="text-zinc-500">Driver:</span>{' '}
              {alert.display_name ?? 'Unknown Crew Member'}
            </p>
            <p>
              <span className="text-zinc-500">Severity:</span>{' '}
              <span className={alert.severity === 'critical' ? 'text-error font-medium capitalize' : 'text-warning font-medium capitalize'}>
                {alert.severity}
              </span>
            </p>
            <p>
              <span className="text-zinc-500">Status:</span>{' '}
              <span className={alert.resolved ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {alert.resolved ? 'Resolved' : 'Unresolved'}
              </span>
            </p>
            {alert.message && (
              <p className="border-t border-zinc-800 pt-1.5 mt-1.5 text-zinc-400 italic font-light">
                "{alert.message}"
              </p>
            )}
            <p className="border-t border-zinc-800 pt-1.5 mt-1.5 text-zinc-400 text-[11px] leading-relaxed">
              {getAlertExplanation(alert.alert_type)}
            </p>
            <p className="mt-2 text-[10px] text-primary font-medium flex items-center gap-0.5">
              Click to open Compliance logs & reports <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-950 dark:bg-zinc-900 rotate-45 -mt-1 border-r border-b border-transparent dark:border-zinc-800" />
        </div>
      )}
    </div>
  );
}
