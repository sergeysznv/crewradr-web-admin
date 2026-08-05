// src/components/shared/StatTile.tsx
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface border border-outline p-4">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-on-surface">{value}</p>
      {trend && (
        <p
          className={cn(
            'mt-1 text-xs',
            trendUp === true
              ? 'text-success'
              : trendUp === false
                ? 'text-error'
                : 'text-on-surface-variant',
          )}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
