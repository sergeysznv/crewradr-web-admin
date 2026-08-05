// src/components/dashboard/AlertFeed.tsx
import { SeverityBadge, type Severity } from '@/components/shared/SeverityBadge';
import { useT } from '@/hooks/use-translations';
import type { FleetDashboard } from '@/types/rpc';

const SEVERITY_MAP: Record<string, Severity> = {
  critical: 'critical', warning: 'warning',
};

export function AlertFeed({ alerts }: { alerts: FleetDashboard['recent_alerts'] }) {
  const { t } = useT();
  return (
    <div className="bg-surface border border-outline rounded-lg p-lg">
      <div className="font-heading font-bold text-sm text-on-surface mb-3">{t('webFleetRecentAlerts')}</div>
      <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
        {alerts.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-lg">{t('webFleetNoAlerts')}</p>
        )}
        {alerts.map(alert => (
          <SeverityBadge
            key={alert.id}
            severity={SEVERITY_MAP[alert.severity] ?? 'info'}
            label={alert.alert_type}
            subtitle={`${alert.display_name ?? t('webFleetUnknown')} · ${new Date(alert.created_at).toLocaleTimeString()}`}
          >
            {alert.message && (
              <p className="mt-1 text-xs text-on-surface-variant leading-snug">{alert.message}</p>
            )}
          </SeverityBadge>
        ))}
      </div>
    </div>
  );
}
