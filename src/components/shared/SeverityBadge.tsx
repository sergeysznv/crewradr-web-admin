// src/components/shared/SeverityBadge.tsx
import type { ReactNode } from 'react';

export type Severity = 'critical' | 'warning' | 'info';

const STYLES: Record<Severity, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-l-error', bg: 'bg-error-container', text: 'text-on-error-container' },
  warning: { border: 'border-l-warning', bg: 'bg-warning-container', text: 'text-on-warning-container' },
  info: { border: 'border-l-primary', bg: 'bg-primary-container', text: 'text-on-primary-container' },
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
      <p className={`text-sm font-semibold ${s.text}`}>{label}</p>
      {subtitle && (
        <p className={`mt-0.5 text-xs ${s.text}`}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}
