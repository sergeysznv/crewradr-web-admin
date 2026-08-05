// src/components/audit-log/AuditLogTable.tsx
'use client';
import { useT } from '@/hooks/use-translations';
import { DataTable } from '@/components/shared/DataTable';
import type { AuditLogEntry } from '@/types/rpc';

const ACTION_COLORS: Record<string, string> = {
  member_added: 'bg-primary-container text-primary',
  member_role_changed: 'bg-warning-container text-warning',
  member_removed: 'bg-error-container text-error',
  member_bulk_import: 'bg-primary-container text-primary',
};

export function AuditLogTable({ logs, total, offset, limit, onOffsetChange }: {
  logs: AuditLogEntry[];
  total: number; offset: number; limit: number;
  onOffsetChange: (o: number) => void;
}) {
  const { t } = useT();
  const columns = [
    {
      key: 'time', header: t('webAuditColTimestamp'),
      render: (l: AuditLogEntry) => (
        <span className="text-xs text-on-surface-variant" title={new Date(l.created_at).toISOString()}>
          {new Date(l.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor', header: t('webAuditColActor'),
      render: (l: AuditLogEntry) => (
        <span className="text-sm text-on-surface">{l.actor_name ?? l.actor_email ?? t('webAuditSystem')}</span>
      ),
    },
    {
      key: 'action', header: t('webAuditColAction'),
      render: (l: AuditLogEntry) => (
        <span className={`px-2 py-0.5 rounded-xl text-2xs font-semibold ${ACTION_COLORS[l.action] ?? 'bg-surface-container text-on-surface-variant'}`}>
          {l.action}
        </span>
      ),
    },
    {
      key: 'target', header: t('webAuditColTarget'),
      render: (l: AuditLogEntry) => (
        <span className="text-sm text-on-surface">{l.target_type}: {l.target_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'details', header: t('webAuditColDetails'),
      render: (l: AuditLogEntry) => (
        <span className="text-xs text-on-surface-variant font-mono max-w-[200px] truncate block">
          {JSON.stringify(l.metadata)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      pagination={{ offset, limit, total, onPageChange: onOffsetChange }}
    />
  );
}
