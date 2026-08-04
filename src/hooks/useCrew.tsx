'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface CrewContextValue {
  crewId: string | null;
  crewName: string;
  tier: string;
  crews: Array<{ crew_id: string; crew_name: string; tier: string; role: string }>;
  setCrew: (crew: { crew_id: string; crew_name: string; tier: string }) => void;
  setCrews: (crews: CrewContextValue['crews']) => void;
}

const CrewContext = createContext<CrewContextValue | null>(null);

export function CrewProvider({ children }: { children: ReactNode }) {
  const [crewId, setCrewId] = useState<string | null>(null);
  const [crewName, setCrewName] = useState('');
  const [tier, setTier] = useState('deckhand');
  const [crews, setCrews] = useState<CrewContextValue['crews']>([]);

  const setCrew = useCallback((c: { crew_id: string; crew_name: string; tier: string }) => {
    setCrewId(c.crew_id);
    setCrewName(c.crew_name);
    setTier(c.tier);
  }, []);

  return (
    <CrewContext.Provider value={{ crewId, crewName, tier, crews, setCrew, setCrews }}>
      {children}
    </CrewContext.Provider>
  );
}

export function useCrew() {
  const ctx = useContext(CrewContext);
  if (!ctx) throw new Error('useCrew must be used within CrewProvider');
  return ctx;
}
