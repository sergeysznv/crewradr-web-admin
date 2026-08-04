// src/components/audit-log/AuditLogView.tsx
'use client';
import { useState } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { useAuditLogs } from '@/hooks/queries/useAuditLogs';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { AuditLogTable } from '@/components/audit-log/AuditLogTable';
import { AuditLogCard } from '@/components/audit-log/AuditLogCard';
import { AuditLogFilters, type DatePreset } from '@/components/audit-log/AuditLogFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScrollText, Download } from 'lucide-react';

const PRESET_DAYS: Record<DatePreset, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

export function AuditLogView() {
  const { crewId } = useCrew();
  const { data, isLoading, setDateFrom, setDateTo, action, setAction, offset, setOffset, limit } = useAuditLogs(crewId);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  // Realtime — append new audit events as they are written.
  useRealtimeInvalidation(
    crewId,
    'admin-audit',
    [{ table: 'enterprise_audit_log', event: 'INSERT' }],
    ['auditLogs', crewId!],
  );

  const logs = data?.logs ?? [];

  function handleDatePresetChange(v: DatePreset) {
    const days = PRESET_DAYS[v];
    setDatePreset(v);
    setDateFrom(days === null ? null : new Date(Date.now() - days * 86400000).toISOString());
    setDateTo(null);
    setOffset(0);
  }

  function handleActionChange(v: string) {
    setAction(v === '' ? null : v);
    setOffset(0);
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <AuditLogFilters
          datePreset={datePreset}
          onDatePresetChange={handleDatePresetChange}
          action={action ?? ''}
          onActionChange={handleActionChange}
        />
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="hidden md:block bg-surface border border-outline rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-lg text-sm text-on-surface-variant">Loading...</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText size={40} />} title="No audit events" message="No events match your current filters." />
        ) : (
          <AuditLogTable logs={logs} total={data?.total ?? 0} offset={offset} limit={limit} onOffsetChange={setOffset} />
        )}
      </div>

      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="p-lg text-sm text-on-surface-variant">Loading...</div>
        ) : (
          logs.map(log => <AuditLogCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
