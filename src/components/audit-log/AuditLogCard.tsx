// src/components/audit-log/AuditLogCard.tsx
import type { AuditLogEntry } from '@/types/rpc';

const ACTION_COLORS: Record<string, string> = {
  member_added: 'bg-primary-container text-primary',
  member_role_changed: 'bg-warning-container text-warning',
  member_removed: 'bg-error-container text-error',
};

export function AuditLogCard({ log }: { log: AuditLogEntry }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-md space-y-2">
      <div className="flex justify-between items-start">
        <span className={`px-2 py-0.5 rounded-xl text-2xs font-semibold ${ACTION_COLORS[log.action] ?? 'bg-surface-container text-on-surface-variant'}`}>
          {log.action}
        </span>
        <span className="text-2xs text-on-surface-variant">{new Date(log.created_at).toLocaleString()}</span>
      </div>
      <div className="text-sm text-on-surface">{log.actor_name ?? log.actor_email ?? 'System'}</div>
      <div className="text-xs text-on-surface-variant">{log.target_type}: {log.target_id.slice(0, 12)}...</div>
    </div>
  );
}
