// src/components/shared/SeverityBadge.tsx
export type Severity = 'critical' | 'warning' | 'info';

const STYLES: Record<Severity, { container: string; border: string; text: string }> = {
  critical: { container: 'bg-error-container', border: 'border-l-error', text: 'text-error' },
  warning: { container: 'bg-warning-container', border: 'border-l-warning', text: 'text-warning' },
  info: { container: 'bg-primary-container', border: 'border-l-primary', text: 'text-primary' },
};

export function SeverityBadge({ severity, label, subtitle }: {
  severity: Severity; label: string; subtitle?: string;
}) {
  const s = STYLES[severity];
  return (
    <div className={`${s.container} ${s.border} border-l-2 rounded-sm px-2 py-1.5`}>
      <div className={`text-xs font-semibold ${s.text}`}>{label}</div>
      {subtitle && <div className="text-2xs text-on-surface-variant mt-0.5">{subtitle}</div>}
    </div>
  );
}
