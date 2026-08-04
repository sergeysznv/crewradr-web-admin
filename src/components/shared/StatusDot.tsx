// src/components/shared/StatusDot.tsx
export type Status = 'active' | 'idle' | 'offline';

const COLOR_MAP: Record<Status, string> = {
  active: 'bg-success',
  idle: 'bg-warning',
  offline: 'bg-on-surface-variant',
};

export function StatusDot({ status, pulse = false }: { status: Status; pulse?: boolean }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      {pulse && status === 'active' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${COLOR_MAP[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${COLOR_MAP[status]}`} />
    </span>
  );
}
