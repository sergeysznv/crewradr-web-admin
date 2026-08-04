// src/components/audit-log/AuditLogFilters.tsx
import { FilterChips } from '@/components/shared/FilterChips';

export type DatePreset = '7d' | '30d' | '90d' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: 'Last 7d' },
  { value: '30d', label: 'Last 30d' },
  { value: '90d', label: 'Last 90d' },
  { value: 'all', label: 'All time' },
];

const ACTIONS = [
  { value: '' as const, label: 'All Actions' },
  { value: 'member_added' as const, label: 'Member Added' },
  { value: 'member_removed' as const, label: 'Member Removed' },
  { value: 'member_role_changed' as const, label: 'Role Changed' },
  { value: 'member_bulk_import' as const, label: 'Bulk Import' },
];

type ActionFilter = (typeof ACTIONS)[number]['value'];

interface Props {
  datePreset: DatePreset; onDatePresetChange: (v: DatePreset) => void;
  action: string; onActionChange: (v: string) => void;
}

export function AuditLogFilters({ datePreset, onDatePresetChange, action, onActionChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-2xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Date Range</div>
        <FilterChips options={DATE_PRESETS} selected={datePreset} onSelect={onDatePresetChange} />
      </div>
      <div>
        <div className="text-2xs uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Action</div>
        <FilterChips options={ACTIONS} selected={action as ActionFilter} onSelect={onActionChange} />
      </div>
    </div>
  );
}
