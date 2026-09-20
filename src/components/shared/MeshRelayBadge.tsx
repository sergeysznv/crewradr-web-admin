// src/components/shared/MeshRelayBadge.tsx
'use client';

import { Radio } from 'lucide-react';
import { useT } from '@/hooks/use-translations';

interface MeshRelayBadgeProps {
  hopCount?: number;
  relayedBy?: string | null;
  className?: string;
}

export function MeshRelayBadge({
  hopCount = 1,
  relayedBy,
  className = '',
}: MeshRelayBadgeProps) {
  const { t } = useT();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 transition-colors ${className}`}
      title={
        relayedBy
          ? `Delivered via Offline BLE Mesh peer relay (${hopCount} ${hopCount === 1 ? 'hop' : 'hops'}) by ${relayedBy}`
          : `Delivered via Offline BLE Mesh peer relay (${hopCount} ${hopCount === 1 ? 'hop' : 'hops'}) in cellular dead zone`
      }
    >
      <Radio className="h-3 w-3 shrink-0 animate-pulse text-purple-600 dark:text-purple-400" />
      <span>{t('webMeshRelayBadge')}</span>
      <span className="rounded-xs bg-purple-500/20 px-1 py-0.2 text-[10px] font-bold">
        {hopCount} {hopCount === 1 ? 'hop' : 'hops'}
      </span>
    </span>
  );
}
