// src/components/shared/SeverityBadge.tsx
import type { ReactNode } from 'react';

export type Severity = 'critical' | 'warning' | 'info';

const STYLES: Record<Severity, { border: string; bg: string }> = {
  critical: { border: 'border-l-error', bg: 'bg-error/5' },
  warning: { border: 'border-l-warning', bg: 'bg-warning/5' },
  info: { border: 'border-l-primary', bg: 'bg-primary/5' },
};

export function SeverityBadge({
  severity,
  label,
  subtitle,
  children,
}: {
  severity: Severity;
  label: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const s = STYLES[severity];
  return (
    <div className={`border-l-4 ${s.border} ${s.bg} rounded-lg p-3`}>
      <p className="text-sm font-semibold text-on-surface">{label}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
