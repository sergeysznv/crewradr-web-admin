// src/components/CrewLoader.tsx
'use client';
import { useEffect, type ReactNode } from 'react';
import { useCrew } from '@/hooks/useCrew';
import { useAccountProfile } from '@/hooks/queries/useAccountProfile';

/**
 * Seeds the crew context from the account profile once at app mount.
 * Mounted in AppProviders (after CrewProvider), so it runs regardless of
 * which page loads first — direct loads of /members, /audit-log, or
 * /settings get a crew selected instead of crewId staying null.
 */
export function CrewLoader({ children }: { children: ReactNode }) {
  const { crewId, setCrew, setCrews } = useCrew();
  const account = useAccountProfile();

  // Sync crews from account profile on first load
  useEffect(() => {
    if (account.data?.crews && !crewId) {
      const crews = account.data.crews.map(c => ({ crew_id: c.crew_id, crew_name: c.crew_name, tier: c.tier, role: c.role }));
      setCrews(crews);
      if (crews.length > 0) setCrew(crews[0]);
    }
  }, [account.data, crewId, setCrew, setCrews]);

  return <>{children}</>;
}
