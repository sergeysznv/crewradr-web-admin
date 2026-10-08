'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { parseCrewKey } from '@/lib/crypto';

const keyListeners = new Set<() => void>();

function subscribeKey(fn: () => void) {
  keyListeners.add(fn);
  return () => {
    keyListeners.delete(fn);
  };
}

function notifyKey() {
  keyListeners.forEach((fn) => fn());
}

const subscribeNoop = () => () => {};

function readKey(crewId: string | null | undefined): string | null {
  if (!crewId) return null;
  try {
    const stored = sessionStorage.getItem(`crewradr_crew_key_${crewId}`);
    return stored && parseCrewKey(stored) ? stored : null;
  } catch (_) {
    return null;
  }
}

export function useCrewKey() {
  const { crewId } = useCrew();
  const crewKey = useSyncExternalStore(
    subscribeKey,
    () => readKey(crewId),
    () => null,
  );
  // False during SSR/hydration, true once mounted on the client.
  const isLoaded = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const setCrewKey = useCallback((key: string): boolean => {
    if (!crewId) return false;
    const parsed = parseCrewKey(key);
    if (!parsed) return false;

    try {
      sessionStorage.setItem(`crewradr_crew_key_${crewId}`, key.trim());
      notifyKey();
      return true;
    } catch (_) {
      return false;
    }
  }, [crewId]);

  const clearCrewKey = useCallback(() => {
    if (!crewId) return;
    try {
      sessionStorage.removeItem(`crewradr_crew_key_${crewId}`);
    } catch (_) {}
    notifyKey();
  }, [crewId]);

  return {
    crewKey,
    hasCrewKey: !!crewKey,
    isLoaded,
    setCrewKey,
    clearCrewKey,
  };
}
