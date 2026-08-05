// src/components/audit-log/AuditLogFilters.tsx
'use client';
import { useT } from '@/hooks/use-translations';
import { FilterChips } from '@/components/shared/FilterChips';

export type DatePreset = '7d' | '30d' | '90d' | 'all';

const DATE_PRESETS: { value: DatePreset; labelKey: string }[] = [
  { value: '7d', labelKey: 'webAuditLast7d' },
  { value: '30d', labelKey: 'webAuditLast30d' },
  { value: '90d', labelKey: 'webAuditLast90d' },
  { value: 'all', labelKey: 'webAuditAllTime' },
];

const ACTIONS = [
  { value: '' as const, labelKey: 'webAuditActionAll' },
  { value: 'member_added' as const, labelKey: 'webAuditActionMemberAdded' },
  { value: 'member_removed' as const, labelKey: 'webAuditActionMemberRemoved' },
  { value: 'member_role_changed' as const, labelKey: 'webAuditActionRoleChanged' },
  { value: 'member_bulk_import' as const, labelKey: 'webAuditActionBulkImport' },
];

type ActionFilter = (typeof ACTIONS)[number]['value'];

interface Props {
  datePreset: DatePreset; onDatePresetChange: (v: DatePreset) => void;
  action: string; onActionChange: (v: string) => void;
}

export function AuditLogFilters({ datePreset, onDatePresetChange, action, onActionChange }: Props) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <div>
        <div className="text-2xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">{t('webAuditDateRange')}</div>
        <FilterChips options={DATE_PRESETS.map((p) => ({ ...p, label: t(p.labelKey) }))} selected={datePreset} onSelect={onDatePresetChange} />
      </div>
      <div>
        <div className="text-2xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">{t('webAuditActionLabel')}</div>
        <FilterChips options={ACTIONS.map((a) => ({ ...a, label: t(a.labelKey) }))} selected={action as ActionFilter} onSelect={onActionChange} />
      </div>
    </div>
  );
}
