// src/hooks/useOffline.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true while the browser reports no network connection.
 * Tracks navigator.onLine plus 'online'/'offline' window events.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return offline;
}
