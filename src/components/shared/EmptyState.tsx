// src/components/shared/EmptyState.tsx
import { type ReactNode } from 'react';

export function EmptyState({ icon, title, message, action }: {
  icon?: ReactNode; title: string; message: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-xxl px-lg text-center">
      {icon && <div className="mb-md text-on-surface-variant opacity-40">{icon}</div>}
      <h3 className="font-heading font-extrabold text-lg text-on-surface">{title}</h3>
      <p className="text-sm text-on-surface-variant mt-1 max-w-[320px]">{message}</p>
      {action && <div className="mt-lg">{action}</div>}
    </div>
  );
}
