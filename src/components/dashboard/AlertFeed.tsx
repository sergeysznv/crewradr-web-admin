// src/components/dashboard/AlertFeed.tsx
import { SeverityBadge, type Severity } from '@/components/shared/SeverityBadge';
import type { FleetDashboard } from '@/types/rpc';

const SEVERITY_MAP: Record<string, Severity> = {
  critical: 'critical', warning: 'warning',
};

export function AlertFeed({ alerts }: { alerts: FleetDashboard['recent_alerts'] }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-lg">
      <div className="font-heading font-bold text-sm text-on-surface mb-3">Alert Feed</div>
      <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
        {alerts.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-lg">No recent alerts</p>
        )}
        {alerts.map(alert => (
          <SeverityBadge
            key={alert.id}
            severity={SEVERITY_MAP[alert.severity] ?? 'info'}
            label={alert.alert_type}
            subtitle={`${alert.display_name ?? 'Unknown'} · ${new Date(alert.created_at).toLocaleTimeString()}`}
          />
        ))}
      </div>
    </div>
  );
}
