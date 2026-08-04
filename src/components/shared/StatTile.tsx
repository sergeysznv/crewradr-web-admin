// src/components/shared/StatTile.tsx
export function StatTile({ label, value, trend, trendUp }: {
  label: string; value: string | number; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-surface border border-outline rounded-md px-4 py-3">
      <div className="text-2xs uppercase text-on-surface-variant tracking-wider">{label}</div>
      <div className="font-heading font-extrabold text-2xl text-on-surface mt-0.5">{value}</div>
      {trend && (
        <div className={`text-2xs mt-0.5 ${trendUp === true ? 'text-success' : trendUp === false ? 'text-error' : 'text-on-surface-variant'}`}>
          {trend}
        </div>
      )}
    </div>
  );
}
