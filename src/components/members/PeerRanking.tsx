// src/components/members/PeerRanking.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import type { CrewRanking } from '@/types/tier';

export function PeerRanking({ crewId }: { crewId: string }) {
  const { t } = useT();
  const supabase = useSupabase();

  // Crew-wide leaderboard: get_web_crew_rankings scores every member in a
  // single RPC (captain+ tier gated server-side) and returns them sorted by
  // overallScore desc with rank attached.
  const { data: rankings = [] } = useQuery({
    queryKey: ['peer_rankings', crewId],
    enabled: !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_web_crew_rankings', {
        p_crew_id: crewId,
        p_days: 90,
      });
      if (error) throw error;
      return (data ?? []) as CrewRanking[];
    },
  });

  if (rankings.length === 0) return null;

  return (
    <div className="rounded-lg border border-outline bg-surface p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {t('webLeaderboardTitle')}
      </h3>
      <div className="space-y-2">
        {rankings.map((r) => (
          <div key={r.memberId} className="flex items-center gap-3 rounded-lg bg-surface-container px-3 py-2">
            <span className="w-6 text-center text-sm font-bold text-on-surface-variant">
              {r.rank}
            </span>
            <span className="flex-1 truncate text-sm text-on-surface">{r.memberName}</span>
            <span className={`text-lg font-bold ${r.overallScore >= 80 ? 'text-success' : r.overallScore >= 60 ? 'text-warning' : 'text-error'}`}>
              {Math.round(r.overallScore)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
