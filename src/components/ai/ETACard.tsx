'use client';

import { useQuery } from '@tanstack/react-query';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useT } from '@/hooks/use-translations';
import { AICard } from './AICard';

interface ETACardProps {
  /** Member's app user id (public.users.id) — the id the predict-eta function expects. */
  memberId: string;
}

interface EtaPayload {
  status: string;
  member_name?: string;
  destination?: string | null;
  eta_minutes?: number;
  confidence?: number;
}

export function ETACard({ memberId }: ETACardProps) {
  const { crewId } = useCrew();
  const { t } = useT();
  const supabase = useSupabase();

  const { data: eta, isLoading, error } = useQuery({
    queryKey: ['etaPrediction', crewId, memberId],
    queryFn: async () => {
      if (!crewId) return null;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const { data, error } = await supabase.functions.invoke('predict-eta', {
        body: { member_id: memberId, crew_id: crewId },
        headers,
      });
      if (error) throw error;
      return (data ?? {}) as EtaPayload;
    },
    enabled: !!crewId,
    // Called on-demand when the detail view opens; stale-while-revalidate
    // keeps it fresh without blocking on every open.
    staleTime: 30_000,
  });

  const serviceDown = !!error;

  return (
    <AICard isLoading={isLoading} serviceDown={serviceDown}>
      {eta?.status === 'no_active_trip' ? (
        <p className="text-xs text-on-surface-variant">{t('webEtaNoActiveTrip')}</p>
      ) : eta?.status === 'ok' ? (
        <>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {t('webEtaArrivalPrediction')}
          </span>
          <div className="mt-1">
            <span className="text-base font-bold text-on-surface">{eta.member_name ?? t('webEtaMember')}</span>
            {eta.destination && (
              <span className="text-xs text-on-surface-variant"> → {eta.destination}</span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary">{eta.eta_minutes}</span>
            <span className="text-sm text-on-surface-variant">min</span>
          </div>
          <p className="text-[10px] text-on-surface-variant">
            {t('webEtaMargin', { pct: Math.round((1 - (eta.confidence ?? 0.5)) * 100) })}
          </p>
        </>
      ) : (
        <p className="text-xs text-on-surface-variant">{t('webEtaNoData')}</p>
      )}
    </AICard>
  );
}
