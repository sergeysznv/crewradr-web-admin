// src/components/shared/EmptyState.tsx
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
      <div className="text-on-surface-variant opacity-40">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-on-surface">{title}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{message}</p>
    </div>
  );
}
