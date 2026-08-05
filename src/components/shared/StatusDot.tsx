// src/components/shared/StatusDot.tsx
export type Status = 'active' | 'offline';

const COLORS: Record<Status, string> = {
  active: 'bg-success',
  offline: 'bg-on-surface-variant opacity-40',
};

export function StatusDot({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${COLORS[status]}`}
      aria-label={status}
      role="status"
    />
  );
}
