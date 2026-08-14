// src/components/dashboard/AlertFeed.tsx
'use client';
import { useState } from 'react';
import { SeverityBadge, type Severity } from '@/components/shared/SeverityBadge';
import { useCrew } from '@/hooks/useCrew';
import { useResolveSafetyAlert } from '@/hooks/queries/useMutations';
import { CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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

function AlertFeedItem({ alert }: { alert: FleetDashboard['recent_alerts'][number] }) {
  const { t } = useT();
  const { role, crewId } = useCrew();
  const [isResolving, setIsResolving] = useState(false);
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className="relative">
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
                  onClick={() => setExpanded(!expanded)}
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
                  onClick={() => setIsResolving(true)}
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
                onClick={() => {
                  setIsResolving(false);
                  setNotes('');
                }}
                disabled={resolveMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="px-2.5 py-1 text-xs bg-primary text-on-primary hover:bg-primary/95 rounded font-semibold disabled:opacity-50"
                onClick={handleResolve}
                disabled={resolveMutation.isPending || !notes.trim()}
              >
                {resolveMutation.isPending ? 'Saving...' : 'Resolve'}
              </button>
            </div>
          </div>
        )}
      </SeverityBadge>
    </div>
  );
}
