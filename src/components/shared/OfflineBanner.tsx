// src/components/shared/OfflineBanner.tsx
'use client';

import { WifiOff } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';

/**
 * Sticky status bar shown at the top of the viewport while the browser is
 * offline. Renders nothing when online.
 */
export function OfflineBanner() {
  const offline = useOffline();

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning/90 px-4 py-2 text-sm font-semibold text-white">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      Working Offline — Data may be out of date
      <span className="ml-2 h-2 w-2 animate-pulse rounded-full bg-white" />
    </div>
  );
}
