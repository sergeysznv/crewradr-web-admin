'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface CrewContextValue {
  crewId: string | null;
  crewName: string;
  tier: string;
  /**
   * Caller's role in the active crew ('captain' | 'co-captain' | 'member',
   * '' while the account profile is still loading). Derives from the crews
   * list so it stays in sync across setCrew / setCrews.
   */
  role: string;
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

  // Role of the caller in the active crew — single source of truth is the
  // crews list (populated by get_web_account_profile), so no extra state to
  // keep in sync when switching crews.
  const role = crews.find((c) => c.crew_id === crewId)?.role ?? '';

  return (
    <CrewContext.Provider value={{ crewId, crewName, tier, role, crews, setCrew, setCrews }}>
      {children}
    </CrewContext.Provider>
  );
}

export function useCrew() {
  const ctx = useContext(CrewContext);
  if (!ctx) throw new Error('useCrew must be used within CrewProvider');
  return ctx;
}
