'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useT } from '@/hooks/use-translations';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatDistanceMeters } from '@/lib/units';
import { Loader2, ShieldCheck, FileText } from 'lucide-react';

// This page uses its own anon client so it works for unauthenticated viewers.
const supabase = createClient(
  'https://amtxzeryaoqdfoadsjsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdHh6ZXJ5YW9xZGZvYWRzanNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyNTQwMDAsImV4cCI6MjAzMTgyNjgwMH0.placeholder',
  { auth: { persistSession: false } },
);

interface SafetyAlert {
  created_at: string;
  alert_type: string;
  severity: string;
  message: string;
  target_user_id?: string | null;
}

interface TripSession {
  user_id: string;
  started_at: string;
  driving_seconds?: number;
  distance_m?: number;
  fatigue_warnings?: number;
}

export default function SharedCompliancePage() {
  const params = useSearchParams();
  const { t } = useT();
  const { system } = useMeasurementSystem();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oshaData, setOshaData] = useState<SafetyAlert[] | null>(null);
  const [eldData, setEldData] = useState<TripSession[] | null>(null);
  const [reportLabel, setReportLabel] = useState('');

  useEffect(() => {
    const type = params.get('type');
    const crew = params.get('crew');
    const since = params.get('since');

    if (!type || !crew || !since) {
      setError('Invalid or missing report parameters.');
      setLoading(false);
      return;
    }

    async function load() {
      try {
        if (type === 'osha') {
          setReportLabel('OSHA 300 Log');
          const { data, error: qErr } = await supabase
            .from('safety_alerts')
            .select()
            .eq('crew_id', crew)
            .gte('created_at', since)
            .order('created_at', { ascending: false });
          if (qErr) throw qErr;
          setOshaData((data ?? []) as SafetyAlert[]);
        } else if (type === 'eld') {
          setReportLabel('ELD Report');
          const { data, error: qErr } = await supabase
            .from('crew_trip_sessions')
            .select()
            .eq('crew_id', crew)
            .gte('started_at', since);
          if (qErr) throw qErr;
          setEldData((data ?? []) as TripSession[]);
        } else {
          setError('Unknown report type.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      }
      setLoading(false);
    }

    load();
  }, [params]);

  const oshaRows = useMemo(() => {
    if (!oshaData) return [];
    return oshaData.map((i) => [i.created_at, i.alert_type, i.severity, i.message, i.target_user_id ?? '']);
  }, [oshaData]);

  const eldRows = useMemo(() => {
    if (!eldData) return [];
    return eldData.map((s) => ({
      userId: s.user_id,
      startedAt: s.started_at,
      hours: ((s.driving_seconds ?? 0) / 3600).toFixed(1),
      distanceM: s.distance_m ?? 0,
      fatigue: String(s.fatigue_warnings ?? 0),
    }));
  }, [eldData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="max-w-sm text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-zinc-300" />
          <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('webComplianceSharedTitle')}</h1>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo-32.png" alt="CrewRadr" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('webComplianceSharedTitle')}</h1>
            <p className="text-sm text-zinc-500">{t('webComplianceSharedDesc')} — {reportLabel}</p>
          </div>
        </div>

        {/* OSHA table */}
        {oshaData && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">OSHA 300 Log</h2>
              <p className="text-xs text-zinc-500">{oshaData.length} records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Severity</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {oshaRows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{new Date(row[0]).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row[1]}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row[2]}</td>
                      <td className="px-3 py-1.5 text-zinc-500 max-w-[300px] truncate">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ELD table */}
        {eldData && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">ELD Report</h2>
              <p className="text-xs text-zinc-500">{eldData.length} records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Driver</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Hours</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Distance</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">Fatigue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {eldRows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 font-mono text-xs">{row.userId.slice(0, 8)}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{new Date(row.startedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.hours}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{formatDistanceMeters(row.distanceM, system)}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.fatigue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-zinc-400">
          {t('webComplianceSharedDesc')} — CrewRadr
        </p>
      </div>
    </div>
  );
}
