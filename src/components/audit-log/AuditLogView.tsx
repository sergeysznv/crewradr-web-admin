// src/components/audit-log/AuditLogView.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useAuditLogs } from '@/hooks/queries/useAuditLogs';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeRefresh';
import { tierRank } from '@/lib/utils';
import { AuditLogTable } from '@/components/audit-log/AuditLogTable';
import { AuditLogCard } from '@/components/audit-log/AuditLogCard';
import { AuditLogFilters, type DatePreset } from '@/components/audit-log/AuditLogFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScrollText, Download, Lock } from 'lucide-react';

const PRESET_DAYS: Record<DatePreset, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

export function AuditLogView() {
  const { t } = useT();
  const { crewId, tier } = useCrew();

  // Tier gate — admiral only (tier >= 3)
  if (tierRank(tier) < 3) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webAuditTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  const { data, isLoading, isError, refetch, setDateFrom, setDateTo, action, setAction, offset, setOffset, limit } = useAuditLogs(crewId);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  // Realtime — append new audit events as they are written.
  useRealtimeInvalidation(
    crewId,
    'admin-audit',
    [{ table: 'enterprise_audit_log', event: 'INSERT', filter: `crew_id=eq.${crewId}` }],
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
    <div className="space-y-lg animate-fade-in">
      <h1 className="text-2xl font-bold text-on-surface">{t('webAuditTitle')}</h1>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <AuditLogFilters
          datePreset={datePreset}
          onDatePresetChange={handleDatePresetChange}
          action={action ?? ''}
          onActionChange={handleActionChange}
        />
        <button
          onClick={() => {
            if (logs.length === 0) return;
            const csvEscape = (v: unknown) => {
              let s = String(v).replace(/"/g, '""');
              if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
              return `"${s}"`;
            };
            const rows = logs.map((l) =>
              [l.created_at, l.actor_name ?? l.actor_email ?? 'System', l.action, `${l.target_type}: ${l.target_id}`, JSON.stringify(l.metadata)]
                .map(csvEscape)
                .join(','),
            );
            const csv = ['Timestamp,Actor,Action,Target,Details', ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          <Download size={14} /> {t('webAuditExport')}
        </button>
      </div>

      <div className="hidden md:block bg-surface border border-outline rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-lg text-sm text-on-surface-variant">{t('webAuditLoading')}</div>
        ) : isError ? (
          <div className="p-lg text-center">
            <p className="text-sm text-on-surface-variant">{t('webAuditFailedToLoad')}</p>
            <button onClick={() => refetch()} className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t('webRetry')}</button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText size={40} />} title={t('webAuditNoEvents')} message={t('webAuditNoEventsHint')} />
        ) : (
          <AuditLogTable logs={logs} total={data?.total ?? 0} offset={offset} limit={limit} onOffsetChange={setOffset} />
        )}
      </div>

      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="p-lg text-sm text-on-surface-variant">{t('webAuditLoading')}</div>
        ) : isError ? null : (
          logs.map(log => <AuditLogCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
