'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { getAuditLogs } from '@/lib/rpc';
import { useState } from 'react';

export function useAuditLogs(crewId: string | null) {
  const supabase = useSupabase();
  // Default matches the '30d' date preset selected in AuditLogView, so the
  // initial query is filtered the same way the UI shows it.
  const [dateFrom, setDateFrom] = useState<string | null>(() => new Date(Date.now() - 30 * 86400000).toISOString());
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const query = useQuery({
    queryKey: ['auditLogs', crewId, dateFrom, dateTo, action, offset],
    queryFn: () => getAuditLogs(supabase, crewId!, dateFrom, dateTo, action, offset, limit),
    enabled: !!crewId,
  });

  return { ...query, dateFrom, setDateFrom, dateTo, setDateTo, action, setAction, offset, setOffset, limit };
}
