'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { parseCrewKey } from '@/lib/crypto';

export function useCrewKey() {
  const { crewId } = useCrew();
  const [crewKey, setCrewKeyState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!crewId) {
      setCrewKeyState(null);
      setIsLoaded(true);
      return;
    }

    try {
      const stored = sessionStorage.getItem(`crewradr_crew_key_${crewId}`);
      if (stored && parseCrewKey(stored)) {
        setCrewKeyState(stored);
      } else {
        setCrewKeyState(null);
      }
    } catch (_) {
      setCrewKeyState(null);
    }
    setIsLoaded(true);
  }, [crewId]);

  const setCrewKey = useCallback((key: string): boolean => {
    if (!crewId) return false;
    const parsed = parseCrewKey(key);
    if (!parsed) return false;

    try {
      sessionStorage.setItem(`crewradr_crew_key_${crewId}`, key.trim());
      setCrewKeyState(key.trim());
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
    setCrewKeyState(null);
  }, [crewId]);

  return {
    crewKey,
    hasCrewKey: !!crewKey,
    isLoaded,
    setCrewKey,
    clearCrewKey,
  };
}
