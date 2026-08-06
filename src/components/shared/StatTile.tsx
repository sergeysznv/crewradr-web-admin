// src/components/shared/StatTile.tsx
import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  return (
    <div className="rounded-lg bg-surface border border-outline p-4">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-extrabold',
          tone === 'good'
            ? 'text-success'
            : tone === 'bad'
              ? 'text-error'
              : 'text-on-surface',
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
      )}
    </div>
  );
}
