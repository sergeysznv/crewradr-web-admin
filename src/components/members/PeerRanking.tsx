// src/components/members/PeerRanking.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import type { MemberScorecard } from '@/types/tier';

export function PeerRanking({ memberIds, crewId }: { memberIds: string[]; crewId: string }) {
  const { t } = useT();
  const supabase = useSupabase();

  // Fetch scorecards for all crew members and sort by overallScore desc
  const { data: rankings = [] } = useQuery({
    queryKey: ['peer_rankings', crewId],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        memberIds.map(async (mid) => {
          const { data } = await supabase.rpc('get_web_member_scorecard', {
            p_member_id: mid,
            p_days: 90,
          });
          return data as MemberScorecard | null;
        })
      );
      return results
        .filter((r): r is MemberScorecard => r !== null)
        .sort((a, b) => b.overallScore - a.overallScore);
    },
  });

  if (rankings.length === 0) return null;

  return (
    <div className="rounded-lg border border-outline bg-surface p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {t('webLeaderboardTitle')}
      </h3>
      <div className="space-y-2">
        {rankings.map((r, i) => (
          <div key={r.memberId} className="flex items-center gap-3 rounded-lg bg-surface-container px-3 py-2">
            <span className="w-6 text-center text-sm font-bold text-on-surface-variant">
              {i + 1}
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
