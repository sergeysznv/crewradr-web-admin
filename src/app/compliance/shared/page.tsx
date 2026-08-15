'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useT } from '@/hooks/use-translations';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatDistanceMeters } from '@/lib/units';
import { Loader2, ShieldCheck } from 'lucide-react';

// This page uses its own anon client so it works for unauthenticated viewers.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}

function csvEscape(v: unknown): string {
  let s = String(v).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}

function ComplianceContent() {
  const params = useSearchParams();
  const { t } = useT();
  const { system } = useMeasurementSystem();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oshaData, setOshaData] = useState<any[] | null>(null);
  const [eldData, setEldData] = useState<TripSession[] | null>(null);
  const [dotData, setDotData] = useState<any[] | null>(null);
  const [reportLabel, setReportLabel] = useState('');

  useEffect(() => {
    const type = params.get('type');
    const crew = params.get('crew');
    const since = params.get('since');

    if (!type || !crew || !since) {
      setError(t('webComplianceReportInvalidParams'));
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_shared_compliance_report', {
          p_type: type,
          p_crew_id: crew,
          p_since: since
        });
        if (rpcErr) throw rpcErr;

        const dataArray = (data ?? []) as any[];

        if (type === 'osha') {
          setReportLabel(t('webComplianceReportOshaLogTitle'));
          setOshaData(dataArray);
        } else if (type === 'eld') {
          setReportLabel(t('webComplianceReportEldTitle'));
          setEldData(dataArray as TripSession[]);
        } else if (type === 'dot') {
          setReportLabel(t('webComplianceReportDotTitle'));
          setDotData(dataArray);
        } else {
          setError(t('webComplianceReportUnknownType'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('webComplianceReportLoadFailed'));
      }
      setLoading(false);
    }

    load();
  }, [params]);

  useEffect(() => {
    if (!loading && !error && params.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, params]);

  const oshaRows = useMemo(() => {
    if (!oshaData) return [];
    return oshaData.map((i) => {
      let classification = t('webComplianceReportOshaClassOther');
      if (i.was_fatality) classification = t('webComplianceReportOshaClassFatality');
      else if ((i.days_away ?? 0) > 0) classification = t('webComplianceReportOshaClassDaysAway');
      else if ((i.restricted_days ?? 0) > 0) classification = t('webComplianceReportOshaClassRestricted');
      else if (i.was_hospitalization) classification = t('webComplianceReportOshaClassHospitalization');

      let details = i.description;
      if (i.location) details += t('webComplianceReportOshaAtLocation', { location: i.location });
      if (i.involved_personnel && i.involved_personnel.length > 0) {
        details += t('webComplianceReportOshaInvolved', { names: i.involved_personnel.join(', ') });
      }

      return [
        i.incident_date,
        i.incident_type,
        classification,
        details,
      ];
    });
  }, [oshaData]);

  const eldRows = useMemo(() => {
    if (!eldData) return [];
    return eldData.map((s) => ({
      userId: s.user_id,
      driverName: (s as any).driver_name as string | undefined,
      startedAt: s.started_at,
      hours: ((s.driving_seconds ?? 0) / 3600).toFixed(1),
      distanceM: s.distance_m ?? 0,
      fatigue: String(s.fatigue_warnings ?? 0),
      compliant: ((s.driving_seconds ?? 0) / 3600) <= 11.0 && (s.fatigue_warnings ?? 0) === 0,
    }));
  }, [eldData]);

  const dotRows = useMemo(() => {
    if (!dotData) return [];
    return dotData.map((s) => {
      const durationMin = Math.floor((s.driving_seconds ?? 0) / 60);
      const fatigueWarnings = s.fatigue_warnings ?? 0;
      const dotCompliant = durationMin <= 660 && fatigueWarnings === 0;
      return {
        userId: s.user_id,
        driverName: (s as any).driver_name as string | undefined,
        startedAt: s.started_at,
        distanceM: s.distance_m ?? 0,
        durationMin,
        fatigue: fatigueWarnings,
        nighttimePct: `${Math.floor(((s.nighttime_seconds ?? 0) / 60))}%`,
        maxSpeedMs: s.max_speed_ms ?? 0,
        weather: s.weather_risk_level ?? 'none',
        compliant: dotCompliant,
      };
    });
  }, [dotData]);

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const type = params.get('type');
    const crew = params.get('crew');
    if (type === 'osha' && oshaData) {
      const headers = [
        t('webComplianceReportCsvColCaseNo'),
        t('webComplianceReportCsvColEmployeeName'),
        t('webComplianceReportCsvColJobTitle'),
        t('webComplianceReportCsvColDateOfInjury'),
        t('webComplianceReportCsvColWhereOccurred'),
        t('webComplianceReportCsvColDescribeInjury'),
        t('webComplianceReportCsvColClassify'),
        t('webComplianceReportCsvColResultedInDeath'),
        t('webComplianceReportCsvColDaysAway'),
        t('webComplianceReportCsvColRestrictedDays'),
        t('webComplianceReportCsvColCaseClassification')
      ];
      const rows = oshaData.map((r: any, index: number) => {
        const fatality = r.was_fatality ? t('webComplianceReportCsvYes') : t('webComplianceReportCsvNo');
        let classification = t('webComplianceReportOshaClassOther');
        if (r.was_fatality) classification = t('webComplianceReportOshaClassFatality');
        else if ((r.days_away ?? 0) > 0) classification = t('webComplianceReportOshaClassDaysAway');
        else if ((r.restricted_days ?? 0) > 0) classification = t('webComplianceReportOshaClassRestricted');
        else if (r.was_hospitalization) classification = t('webComplianceReportOshaClassHospitalization');

        return [
          index + 1,
          (r.involved_personnel ?? []).join('; ') || t('webComplianceReportCsvUnknown'),
          '',
          r.incident_date,
          r.location ?? t('webComplianceReportCsvUnknown'),
          r.description,
          classification,
          fatality,
          r.days_away ?? 0,
          r.restricted_days ?? 0,
          r.incident_type
        ];
      });
      const csv = [
        t('webComplianceReportCsvFormTitle'),
        t('webComplianceReportCsvCrewId', { crew: crew ?? '' }),
        t('webComplianceReportCsvYear', { year: new Date().getFullYear() }),
        '',
        headers.join(','),
        ...rows.map((row) => row.map(csvEscape).join(','))
      ].join('\n');
      download(`osha-300-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
    } else if (type === 'eld' && eldData) {
      const distanceHeader = system === 'imperial' ? t('webComplianceReportCsvDistanceMi') : t('webComplianceReportCsvDistanceKm');
      const distanceValue = (m: number) =>
        system === 'imperial' ? (m / 1609.344).toFixed(1) : (m / 1000).toFixed(1);
      const csv = [
        [t('webComplianceReportCsvDriver'), t('webComplianceReportCsvDate'), t('webComplianceReportCsvDrivingHours'), distanceHeader, t('webComplianceReportCsvFatigueWarnings'), t('webComplianceReportCsvHosViolation')].join(','),
        ...eldRows.map((r) => {
          const violation = Number(r.hours) > 11.0 ? t('webComplianceReportCsvExceeds11h') : t('webComplianceReportCsvNo');
          return [r.driverName || r.userId, r.startedAt, r.hours, distanceValue(r.distanceM), r.fatigue, violation]
            .map(csvEscape)
            .join(',')
        })
      ].join('\n');
      download(`eld-report-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
    } else if (type === 'dot' && dotData) {
      const distanceHeader = system === 'imperial' ? t('webComplianceReportColDistanceMi') : t('webComplianceReportColDistanceKm');
      const speedHeader = system === 'imperial' ? t('webComplianceReportColMaxSpeedMph') : t('webComplianceReportColMaxSpeedKmh');

      const distanceValue = (m: number) =>
        system === 'imperial' ? (m / 1609.344).toFixed(1) : (m / 1000).toFixed(1);
      const speedValue = (ms: number) =>
        system === 'imperial' ? (ms * 2.236936).toFixed(0) : (ms * 3.6).toFixed(0);

      const csv = [
        [t('webComplianceReportCsvDriver'), t('webComplianceReportCsvDate'), distanceHeader, t('webComplianceReportCsvDurationMin'), t('webComplianceReportCsvFatigueWarnings'), t('webComplianceReportCsvNighttimePct'), speedHeader, t('webComplianceReportCsvWeatherRisk'), t('webComplianceReportCsvDotCompliant')].join(','),
        ...dotData.map((s) => {
          const durationMin = Math.floor((s.driving_seconds ?? 0) / 60);
          const fatigueWarnings = s.fatigue_warnings ?? 0;
          const dotCompliant = durationMin <= 660 && fatigueWarnings === 0 ? t('webComplianceReportCsvYes') : t('webComplianceReportCsvNo');
          const nighttimePct = `${Math.floor(((s.nighttime_seconds ?? 0) / 60))}%`;

          return [
            s.driver_name || s.user_id,
            s.started_at,
            distanceValue(s.distance_m ?? 0),
            durationMin,
            fatigueWarnings,
            nighttimePct,
            speedValue(s.max_speed_ms ?? 0),
            s.weather_risk_level ?? 'none',
            dotCompliant,
          ]
            .map(csvEscape)
            .join(',');
        })
      ].join('\n');
      download(`dot-compliance-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
    }
  }

  if (loading) return <LoadingFallback />;

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
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            padding: 1.5cm 2cm;
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-4xl">
        {/* Header Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-700 pb-4 no-print">
          <div className="flex items-center gap-3">
            <img src="/logo-32.png" alt="CrewRadr" className="h-8 w-8 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('webComplianceSharedTitle')}</h1>
              <p className="text-sm text-zinc-500">{t('webComplianceSharedDesc')} — {reportLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              {t('webComplianceReportPrint')}
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3.5 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {t('webComplianceReportDownloadCsv')}
            </button>
          </div>
        </div>

        {/* OSHA table (Screen only) */}
        {oshaData && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden print:hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{t('webComplianceReportOshaLogTitle')}</h2>
              <p className="text-xs text-zinc-500">{t('webComplianceReportRecordsCount', { count: oshaData.length })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDate')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColType')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColSeverity')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDescription')}</th>
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

        {/* ELD table (Screen only) */}
        {eldData && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden print:hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{t('webComplianceReportEldTitle')}</h2>
              <p className="text-xs text-zinc-500">{t('webComplianceReportRecordsCount', { count: eldData.length })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDriver')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDate')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColHours')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDistance')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColFatigue')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {eldRows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 font-medium text-xs">{row.driverName || row.userId.slice(0, 8)}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{new Date(row.startedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.hours}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{formatDistanceMeters(row.distanceM, system)}</td>
                      <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.fatigue}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {row.compliant ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
                            {t('webComplianceReportStatusCompliant')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                            {t('webComplianceReportStatusViolation')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOT table (Screen only) */}
        {dotData && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden print:hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{t('webComplianceReportDotTitle')}</h2>
              <p className="text-xs text-zinc-500">{t('webComplianceReportRecordsCount', { count: dotData.length })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDriver')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDate')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t(system === 'imperial' ? 'webComplianceReportColDistanceMi' : 'webComplianceReportColDistanceKm')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColDurationMin')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColFatigue')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColNighttimePct')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t(system === 'imperial' ? 'webComplianceReportColMaxSpeedMph' : 'webComplianceReportColMaxSpeedKmh')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColWeatherRisk')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-500">{t('webComplianceReportColStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dotRows.map((row, i) => {
                    const distVal = system === 'imperial' ? (row.distanceM / 1609.344).toFixed(1) : (row.distanceM / 1000).toFixed(1);
                    const speedVal = system === 'imperial' ? (row.maxSpeedMs * 2.236936).toFixed(0) : (row.maxSpeedMs * 3.6).toFixed(0);
                    return (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 font-medium text-xs">{row.driverName || row.userId.slice(0, 8)}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{new Date(row.startedAt).toLocaleDateString()}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{distVal}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.durationMin}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.fatigue}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{row.nighttimePct}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">{speedVal}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 capitalize">{row.weather}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {row.compliant ? (
                            <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
                              {t('webComplianceReportStatusCompliant')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                              {t('webComplianceReportStatusViolation')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Professional Print Layout (Only visible during print) */}
        <div className="hidden print:block font-sans text-black bg-white p-6 leading-relaxed">
          {/* Document Header */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">
                  {params.get('type') === 'osha'
                    ? t('webComplianceReportPrintTitleOsha')
                    : params.get('type') === 'eld'
                      ? t('webComplianceReportPrintTitleEld')
                      : t('webComplianceReportPrintTitleDot')}
                </h1>
                <p className="text-xs text-zinc-600 mt-1">
                  {params.get('type') === 'osha'
                    ? t('webComplianceReportPrintAgencyOsha')
                    : t('webComplianceReportPrintAgencyDot')}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold">{t('webComplianceReportPrintFleetCompliance')}</p>
                <p>{t('webComplianceReportPrintCrewId', { crew: params.get('crew') ?? '' })}</p>
                <p>{t('webComplianceReportPrintGenerated', { date: new Date().toLocaleString() })}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs bg-zinc-100 p-3 rounded border border-zinc-300">
              <div>
                <span className="font-semibold text-zinc-600 uppercase block text-[10px]">{t('webComplianceReportPrintEstablishment')}</span>
                <span className="font-medium text-sm text-black">{t('webComplianceReportPrintFleetUnit')}</span>
              </div>
              <div>
                <span className="font-semibold text-zinc-600 uppercase block text-[10px]">{t('webComplianceReportPrintAuditPeriod')}</span>
                <span className="font-medium text-sm text-black">{t(params.get('type') === 'osha' ? 'webComplianceReportPrintPast12Months' : 'webComplianceReportPrintPast30Days')}</span>
              </div>
              <div>
                <span className="font-semibold text-zinc-600 uppercase block text-[10px]">{t('webComplianceReportPrintRecordStatus')}</span>
                <span className="font-semibold text-sm uppercase text-green-700">{t('webComplianceReportPrintOfficialCertified')}</span>
              </div>
            </div>
          </div>

          {/* Document Tables */}
          {params.get('type') === 'osha' && oshaData && (
            <div>
              <table className="w-full text-[11px] border-collapse border border-black">
                <thead>
                  <tr className="bg-zinc-100 border-b border-black">
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColCaseNo')}</th>
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColIncidentDate')}</th>
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColIncidentType')}</th>
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColSeverityClassification')}</th>
                    <th className="p-2 text-left font-bold">{t('webComplianceReportPrintColDescription')}</th>
                  </tr>
                </thead>
                <tbody>
                  {oshaRows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-400">
                      <td className="border-r border-black p-2 font-semibold">{i + 1}</td>
                      <td className="border-r border-black p-2 whitespace-nowrap">{new Date(row[0]).toLocaleDateString()}</td>
                      <td className="border-r border-black p-2">{row[1]}</td>
                      <td className="border-r border-black p-2">{row[2]}</td>
                      <td className="p-2">{row[3]}</td>
                    </tr>
                  ))}
                  {oshaRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-zinc-500 italic">{t('webComplianceReportPrintNoOshaIncidents')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {params.get('type') === 'eld' && eldData && (
            <div>
              <table className="w-full text-[11px] border-collapse border border-black">
                <thead>
                  <tr className="bg-zinc-100 border-b border-black">
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColDriverId')}</th>
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColDate')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColDrivingHours')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColDistance')}</th>
                    <th className="border-r border-black p-2 text-center font-bold">{t('webComplianceReportPrintColFatigueWarnings')}</th>
                    <th className="p-2 text-center font-bold">{t('webComplianceReportPrintColAuditStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {eldRows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-400">
                      <td className="border-r border-black p-2">{row.driverName || row.userId.slice(0, 8)}</td>
                      <td className="border-r border-black p-2 whitespace-nowrap">{new Date(row.startedAt).toLocaleDateString()}</td>
                      <td className="border-r border-black p-2 text-right">{row.hours}{t('webComplianceReportUnitH')}</td>
                      <td className="border-r border-black p-2 text-right">{formatDistanceMeters(row.distanceM, system)}</td>
                      <td className="border-r border-black p-2 text-center">{row.fatigue}</td>
                      <td className="p-2 text-center font-semibold uppercase">
                        {row.compliant ? (
                          <span className="text-green-700">{t('webComplianceReportPrintStatusCompliant')}</span>
                        ) : (
                          <span className="text-red-700">{t('webComplianceReportPrintStatusViolation')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {eldRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-zinc-500 italic">{t('webComplianceReportPrintNoEldSessions')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {params.get('type') === 'dot' && dotData && (
            <div>
              <table className="w-full text-[11px] border-collapse border border-black">
                <thead>
                  <tr className="bg-zinc-100 border-b border-black">
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColDriverId')}</th>
                    <th className="border-r border-black p-2 text-left font-bold">{t('webComplianceReportPrintColDate')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColDistance')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColDuration')}</th>
                    <th className="border-r border-black p-2 text-center font-bold">{t('webComplianceReportPrintColFatigueAlerts')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColNightPct')}</th>
                    <th className="border-r border-black p-2 text-right font-bold">{t('webComplianceReportPrintColMaxSpeed')}</th>
                    <th className="border-r border-black p-2 text-center font-bold">{t('webComplianceReportPrintColWeatherRisk')}</th>
                    <th className="p-2 text-center font-bold">{t('webComplianceReportPrintColAuditStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dotRows.map((row, i) => {
                    const distVal = system === 'imperial' ? (row.distanceM / 1609.344).toFixed(1) : (row.distanceM / 1000).toFixed(1);
                    const speedVal = system === 'imperial' ? (row.maxSpeedMs * 2.236936).toFixed(0) : (row.maxSpeedMs * 3.6).toFixed(0);
                    return (
                      <tr key={i} className="border-b border-zinc-400">
                        <td className="border-r border-black p-2">{row.driverName || row.userId.slice(0, 8)}</td>
                        <td className="border-r border-black p-2 whitespace-nowrap">{new Date(row.startedAt).toLocaleDateString()}</td>
                        <td className="border-r border-black p-2 text-right">{distVal} {t(system === 'imperial' ? 'webComplianceReportUnitMi' : 'webComplianceReportUnitKm')}</td>
                        <td className="border-r border-black p-2 text-right">{row.durationMin}{t('webComplianceReportUnitMin')}</td>
                        <td className="border-r border-black p-2 text-center">{row.fatigue}</td>
                        <td className="border-r border-black p-2 text-right">{row.nighttimePct}</td>
                        <td className="border-r border-black p-2 text-right">{speedVal} {t(system === 'imperial' ? 'webComplianceReportUnitMph' : 'webComplianceReportUnitKmh')}</td>
                        <td className="border-r border-black p-2 text-center capitalize">{row.weather}</td>
                        <td className="p-2 text-center font-semibold uppercase">
                          {row.compliant ? (
                            <span className="text-green-700">{t('webComplianceReportPrintStatusCompliant')}</span>
                          ) : (
                            <span className="text-red-700">{t('webComplianceReportPrintStatusViolation')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {dotRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-zinc-500 italic">{t('webComplianceReportPrintNoDotData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Certification Block */}
          <div className="mt-12 pt-8 border-t border-zinc-400">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2">{t('webComplianceReportCertificationTitle')}</h3>
            <p className="text-[10px] text-zinc-600 mb-6 leading-relaxed">
              {t('webComplianceReportCertificationText')}
            </p>
            <div className="flex justify-between gap-12 text-xs">
              <div className="flex-1">
                <div className="border-b border-black h-8"></div>
                <p className="mt-1 text-[10px] text-zinc-600 uppercase">{t('webComplianceReportPrintSignatureLabel')}</p>
              </div>
              <div className="w-1/3">
                <div className="border-b border-black h-8"></div>
                <p className="mt-1 text-[10px] text-zinc-600 uppercase">{t('webComplianceReportPrintDateCertified')}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400 print:hidden">
          {t('webComplianceSharedDesc')} — CrewRadr
        </p>
      </div>
    </div>
  );
}

export default function SharedCompliancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ComplianceContent />
    </Suspense>
  );
}
