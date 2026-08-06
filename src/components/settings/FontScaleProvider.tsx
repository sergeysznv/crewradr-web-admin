'use client';

import { type ReactNode, useEffect } from 'react';
import { useFontScale } from '@/hooks/useFontScale';

/**
 * Applies the user's font scale preference to <html> so all rem-based
 * sizing scales proportionally.  Wraps useFontScale().
 */
export function FontScaleProvider({ children }: { children: ReactNode }) {
  const { scale } = useFontScale();

  useEffect(() => {
    // Map scale factor → percentage of base (1.0 = 100%, 1.2 = 120%, etc.)
    document.documentElement.style.fontSize = `${scale * 100}%`;
  }, [scale]);

  return <>{children}</>;
}
