// src/components/compliance/ComplianceView.tsx
'use client';

import { useState, useMemo } from 'react';
import { useT } from '@/hooks/use-translations';

function csvEscape(v: unknown): string {
  let s = String(v).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';
import { formatDistanceMeters } from '@/lib/units';
import { useSnackbar } from '@/components/shared/Snackbar';
import { tierRank } from '@/lib/utils';
import { FileText, Download, Loader2, Check, Mail, Lock, Eye, X, ChevronDown, Share2, Printer } from 'lucide-react';

interface SafetyAlert {
  created_at: string;
  alert_type: string;
  severity: string;
  message: string;
  target_user_id?: string | null;
}

interface OshaIncidentReport {
  id: string;
  crew_id: string;
  reporter_id: string;
  incident_type: string;
  incident_date: string;
  description: string;
  location?: string | null;
  involved_personnel?: string[] | null;
  was_fatality?: boolean;
  was_hospitalization?: boolean;
  was_amputation?: boolean;
  was_eye_loss?: boolean;
  days_away?: number | null;
  restricted_days?: number | null;
  form_300_complete?: boolean;
  form_301_complete?: boolean;
  form_300a_complete?: boolean;
  created_at: string;
  updated_at: string;
}

interface TripSession {
  user_id: string;
  started_at: string;
  driving_seconds?: number;
  distance_m?: number;
  fatigue_warnings?: number;
}

export function ComplianceView() {
  const { t } = useT();
  const { system } = useMeasurementSystem();
  const { crewId, tier } = useCrew();
  const supabase = useSupabase();
  const { showSuccess, showError } = useSnackbar();
  const [genOsha, setGenOsha] = useState(false);
  const [genEld, setGenEld] = useState(false);
  const [genDot, setGenDot] = useState(false);
  const [lastGen, setLastGen] = useState('');

  const [oshaData, setOshaData] = useState<OshaIncidentReport[] | null>(null);
  const [eldData, setEldData] = useState<TripSession[] | null>(null);
  const [dotData, setDotData] = useState<any[] | null>(null);
  const [showOshaPreview, setShowOshaPreview] = useState(false);
  const [showEldPreview, setShowEldPreview] = useState(false);
  const [showDotPreview, setShowDotPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmiral = tierRank(tier) >= 3;

  // ── Share helpers ──
  function buildShareUrl(reportType: 'osha' | 'eld' | 'dot'): string {
    const base = `${window.location.origin}/compliance/shared`;
    const since = new Date();
    if (reportType === 'osha') since.setFullYear(since.getFullYear() - 1);
    else since.setDate(since.getDate() - 30);
    const params = new URLSearchParams({
      type: reportType,
      crew: crewId ?? '',
      since: since.toISOString(),
    });
    return `${base}?${params.toString()}`;
  }

  function copyShareLink(reportType: 'osha' | 'eld' | 'dot') {
    const url = buildShareUrl(reportType);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showSuccess(t('webComplianceShareCopied'));
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => showError('Clipboard access denied'));
  }

  function handlePrint(reportType: 'osha' | 'eld' | 'dot') {
    const url = buildShareUrl(reportType) + '&print=true';
    window.open(url, '_blank');
  }

  function handleEmail(reportType: 'osha' | 'eld' | 'dot') {
    const url = buildShareUrl(reportType);
    const subject = encodeURIComponent(t('webComplianceShareEmailSubject'));
    const body = encodeURIComponent(t('webComplianceShareEmailBody', { url }));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  const oshaRows = useMemo(() => {
    if (!oshaData) return [];
    return oshaData.map((i) => {
      let classification = 'Other Recordable';
      if (i.was_fatality) classification = 'Fatality';
      else if ((i.days_away ?? 0) > 0) classification = 'Days Away';
      else if ((i.restricted_days ?? 0) > 0) classification = 'Restricted';
      else if (i.was_hospitalization) classification = 'Hospitalization';

      let details = i.description;
      if (i.location) details += ` at ${i.location}`;
      if (i.involved_personnel && i.involved_personnel.length > 0) {
        details += ` (Involved: ${i.involved_personnel.join(', ')})`;
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

  async function generateOsha() {
    setGenOsha(true);
    try {
      if (!crewId) return;
      const since = new Date();
      since.setFullYear(since.getFullYear() - 1);
      const { data: incidents, error } = await supabase
        .from('osha_incident_reports')
        .select()
        .eq('crew_id', crewId)
        .gte('incident_date', since.toISOString().split('T')[0])
        .order('incident_date', { ascending: false });
      if (error) { showError(t('webComplianceOshaFailed')); return; }
      setOshaData((incidents ?? []) as OshaIncidentReport[]);
      setShowOshaPreview(true);
      setLastGen(`${t('webComplianceOshaTitle')} — ${new Date().toLocaleString()}`);
    } catch { showError(t('webComplianceOshaFailed')); }
    setGenOsha(false);
  }

  async function generateEld() {
    setGenEld(true);
    try {
      if (!crewId) return;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: sessions, error: qErr } = await supabase
        .from('crew_trip_sessions')
        .select()
        .eq('crew_id', crewId)
        .gte('started_at', since.toISOString());
      if (qErr) { showError(qErr.message); return; }
      if (!sessions?.length) { showError(t('webComplianceNoTripData')); return; }
      setEldData(sessions as TripSession[]);
      setShowEldPreview(true);
      setLastGen(`${t('webComplianceEldTitle')} — ${new Date().toLocaleString()}`);
    } catch { showError(t('webComplianceEldFailed')); }
    setGenEld(false);
  }

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadOsha() {
    const headers = [
      'Case No.',
      'Employee Name',
      'Job Title',
      'Date of Injury',
      'Where Event Occurred',
      'Describe Injury/Illness',
      'Classify',
      'Resulted in Death?',
      'Days Away',
      'Restricted Days',
      'Case Classification'
    ];
    const rows = (oshaData ?? []).map((r: any, index: number) => {
      const fatality = r.was_fatality ? 'Yes' : 'No';
      let classification = 'Other Recordable';
      if (r.was_fatality) classification = 'Fatality';
      else if ((r.days_away ?? 0) > 0) classification = 'Days Away';
      else if ((r.restricted_days ?? 0) > 0) classification = 'Restricted';
      else if (r.was_hospitalization) classification = 'Hospitalization';

      return [
        index + 1,
        (r.involved_personnel ?? []).join('; ') || 'Unknown',
        '', // Job Title
        r.incident_date,
        r.location ?? 'Unknown',
        r.description,
        classification,
        fatality,
        r.days_away ?? 0,
        r.restricted_days ?? 0,
        r.incident_type
      ];
    });
    const csv = [
      'OSHA Form 300 - Log of Work-Related Injuries and Illnesses',
      `Crew ID,${crewId}`,
      `Year,${new Date().getFullYear()}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.map(csvEscape).join(','))
    ].join('\n');
    download(`osha-300-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  function downloadEld() {
    const distanceHeader = system === 'imperial' ? 'DistanceMi' : 'DistanceKm';
    const distanceValue = (m: number) =>
      system === 'imperial' ? (m / 1609.344).toFixed(1) : (m / 1000).toFixed(1);
    const csv = [`Driver,Date,DrivingHours,${distanceHeader},FatigueWarnings,HOSViolation`,
      ...eldRows.map((r) => {
        const violation = Number(r.hours) > 11.0 ? 'Yes - Exceeds 11h limit' : 'No';
        return [r.userId, r.startedAt, r.hours, distanceValue(r.distanceM), r.fatigue, violation]
          .map(csvEscape)
          .join(',')
      })
    ].join('\n');
    download(`eld-report-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  async function generateDot() {
    setGenDot(true);
    try {
      if (!crewId) return;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error: qErr } = await supabase
        .from('crew_trip_sessions')
        .select(`
          user_id,
          started_at,
          distance_m,
          driving_seconds,
          fatigue_warnings,
          max_speed_ms,
          nighttime_seconds,
          weather_risk_level
        `)
        .eq('crew_id', crewId)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false });

      if (qErr) throw qErr;
      setDotData(data ?? []);
      setLastGen(new Date().toLocaleString());
      showSuccess(t('webComplianceDotSuccess') || 'DOT compliance report generated successfully.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to generate DOT report');
    }
    setGenDot(false);
  }

  function downloadDot() {
    if (!dotData) return;
    const distanceHeader = system === 'imperial' ? 'Distance (mi)' : 'Distance (km)';
    const speedHeader = system === 'imperial' ? 'Max Speed (mph)' : 'Max Speed (km/h)';

    const distanceValue = (m: number) =>
      system === 'imperial' ? (m / 1609.344).toFixed(1) : (m / 1000).toFixed(1);
    const speedValue = (ms: number) =>
      system === 'imperial' ? (ms * 2.236936).toFixed(0) : (ms * 3.6).toFixed(0);

    const csv = [
      `Driver ID,Date,${distanceHeader},Duration (min),Fatigue Warnings,Nighttime %,${speedHeader},Weather Risk,DOT Compliant`,
      ...dotData.map((s) => {
        const durationMin = Math.floor((s.driving_seconds ?? 0) / 60);
        const fatigueWarnings = s.fatigue_warnings ?? 0;
        const dotCompliant = durationMin <= 660 && fatigueWarnings === 0 ? 'Yes' : 'No';
        const nighttimePct = `${Math.floor(((s.nighttime_seconds ?? 0) / 60))}%`;

        return [
          s.user_id,
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

  // ── Tier gate ──
  if (!isAdmiral) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status">
        <div className="text-center max-w-sm">
          <Lock className="mx-auto h-10 w-10 text-on-surface-variant opacity-50" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-on-surface">{t('webComplianceTitle')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{t('webUpgradeRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-sz-lg animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{t('webComplianceTitle')}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceDescription')}</p>
      </div>

      {lastGen && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-on-surface">
          <Check className="inline h-4 w-4 mr-1 text-success" />
          {t('webComplianceLastGenerated')}: {lastGen}
        </div>
      )}

      {/* OSHA 300 */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceOshaTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceOshaDesc')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={generateOsha} disabled={genOsha}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                {genOsha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {genOsha ? t('webComplianceGenerating') : t('webComplianceGenerateReport')}
              </button>
              {oshaData && (
                <>
                  <button onClick={() => setShowOshaPreview(!showOshaPreview)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container">
                    {showOshaPreview ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showOshaPreview ? t('webComplianceHide') : t('webCompliancePreview', { count: oshaData.length })}
                  </button>
                  <button onClick={downloadOsha}
                    className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                    <Download className="h-4 w-4" /> {t('webComplianceDownloadCsv')}
                  </button>
                </>
              )}
              {oshaData && (
                <div className="mt-3 flex items-center gap-2 border-t border-outline-variant pt-3">
                  <span className="text-xs font-medium text-on-surface-variant">{t('webComplianceShareTitle')}:</span>
                  <button onClick={() => copyShareLink('osha')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Share2 className="h-3.5 w-3.5" /> {t('webComplianceShareCopyLink')}
                  </button>
                  <button onClick={() => handlePrint('osha')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Printer className="h-3.5 w-3.5" /> {t('webComplianceSharePrint')}
                  </button>
                  <button onClick={() => handleEmail('osha')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Mail className="h-3.5 w-3.5" /> {t('webComplianceShareEmail')}
                  </button>
                  {copied && <span className="text-xs text-success">{t('webComplianceShareCopied')}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {showOshaPreview && oshaData && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDate')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColType')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColSeverity')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDescription')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {oshaRows.slice(0, 25).map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container/50">
                    <td className="px-3 py-1.5 text-on-surface whitespace-nowrap" title={new Date(row[0]).toLocaleString()}>{new Date(row[0]).toLocaleDateString()}</td>
                    <td className="px-3 py-1.5 text-on-surface">{row[1]}</td>
                    <td className="px-3 py-1.5 text-on-surface">{row[2]}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant max-w-[200px] truncate" title={row[3]}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {oshaRows.length > 25 && (
              <p className="px-3 py-2 text-xs text-on-surface-variant border-t border-outline-variant">
                {t('webComplianceShowingN', { shown: 25, total: oshaRows.length })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ELD */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-surface">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceEldTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceEldDesc')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={generateEld} disabled={genEld}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                {genEld ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {genEld ? t('webComplianceGenerating') : t('webComplianceGenerateReport')}
              </button>
              {eldData && (
                <>
                  <button onClick={() => setShowEldPreview(!showEldPreview)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container">
                    {showEldPreview ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showEldPreview ? t('webComplianceHide') : t('webCompliancePreview', { count: eldData.length })}
                  </button>
                  <button onClick={downloadEld}
                    className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                    <Download className="h-4 w-4" /> {t('webComplianceDownloadCsv')}
                  </button>
                </>
              )}
              {eldData && (
                <div className="mt-3 flex items-center gap-2 border-t border-outline-variant pt-3">
                  <span className="text-xs font-medium text-on-surface-variant">{t('webComplianceShareTitle')}:</span>
                  <button onClick={() => copyShareLink('eld')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Share2 className="h-3.5 w-3.5" /> {t('webComplianceShareCopyLink')}
                  </button>
                  <button onClick={() => handlePrint('eld')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Printer className="h-3.5 w-3.5" /> {t('webComplianceSharePrint')}
                  </button>
                  <button onClick={() => handleEmail('eld')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Mail className="h-3.5 w-3.5" /> {t('webComplianceShareEmail')}
                  </button>
                  {copied && <span className="text-xs text-success">{t('webComplianceShareCopied')}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {showEldPreview && eldData && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDriver')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDate')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColHours')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDistance')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColFatigue')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webMembersColStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {eldRows.slice(0, 25).map((row, i) => (
                  <tr key={i} className="hover:bg-surface-container/50">
                    <td className="px-3 py-1.5 text-on-surface font-mono text-xs" title={row.userId}>{row.userId.slice(0, 8)}</td>
                    <td className="px-3 py-1.5 text-on-surface whitespace-nowrap" title={new Date(row.startedAt).toLocaleString()}>{new Date(row.startedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-1.5 text-on-surface" title={`${row.hours} driving hours logged`}>{row.hours}</td>
                    <td className="px-3 py-1.5 text-on-surface" title={`${formatDistanceMeters(row.distanceM, system)} logged`}>{formatDistanceMeters(row.distanceM, system)}</td>
                    <td className="px-3 py-1.5 text-on-surface" title={`${row.fatigue} fatigue warnings triggered`}>{row.fatigue}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={row.compliant ? 'Within HOS limits' : Number(row.hours) > 11.0 ? 'Violation: Exceeded 11h daily limit' : 'Violation: Fatigue warnings detected'}>
                      {row.compliant ? (
                        <span className="inline-flex items-center rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          Compliant
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-error/15 px-1.5 py-0.5 text-[10px] font-medium text-error">
                          Violation
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eldRows.length > 25 && (
              <p className="px-3 py-2 text-xs text-on-surface-variant border-t border-outline-variant">
                {t('webComplianceShowingN', { shown: 25, total: eldRows.length })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* DOT Compliance */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceDotTitle') || 'DOT Compliance Report'}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceDotDesc') || 'Regulatory summary of driving duration, distance, speed, and safety compliance across all drivers for the last 30 days.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={generateDot} disabled={genDot}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
                {genDot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {genDot ? t('webComplianceGenerating') : t('webComplianceGenerateDot') || 'Generate DOT Report'}
              </button>
              {dotData && (
                <>
                  <button onClick={() => setShowDotPreview(!showDotPreview)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container">
                    {showDotPreview ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showDotPreview ? t('webComplianceHide') : t('webCompliancePreview', { count: dotData.length })}
                  </button>
                  <button onClick={downloadDot}
                    className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
                    <Download className="h-4 w-4" /> {t('webComplianceDownloadCsv')}
                  </button>
                </>
              )}
              {dotData && (
                <div className="mt-3 flex items-center gap-2 border-t border-outline-variant pt-3">
                  <span className="text-xs font-medium text-on-surface-variant">{t('webComplianceShareTitle')}:</span>
                  <button onClick={() => copyShareLink('dot')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Share2 className="h-3.5 w-3.5" /> {t('webComplianceShareCopyLink')}
                  </button>
                  <button onClick={() => handlePrint('dot')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Printer className="h-3.5 w-3.5" /> {t('webComplianceSharePrint')}
                  </button>
                  <button onClick={() => handleEmail('dot')}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <Mail className="h-3.5 w-3.5" /> {t('webComplianceShareEmail')}
                  </button>
                  {copied && <span className="text-xs text-success">{t('webComplianceShareCopied')}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {showDotPreview && dotData && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDriver') || 'Driver'}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webComplianceColDate') || 'Date'}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{system === 'imperial' ? 'Distance (mi)' : 'Distance (km)'}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">Duration (min)</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">Fatigue</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">Nighttime %</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{system === 'imperial' ? 'Max Speed (mph)' : 'Max Speed (km/h)'}</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">Weather Risk</th>
                  <th className="px-3 py-2 text-left font-semibold text-on-surface-variant">{t('webMembersColStatus') || 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {dotRows.slice(0, 25).map((row, i) => {
                  const distVal = system === 'imperial' ? (row.distanceM / 1609.344).toFixed(1) : (row.distanceM / 1000).toFixed(1);
                  const speedVal = system === 'imperial' ? (row.maxSpeedMs * 2.236936).toFixed(0) : (row.maxSpeedMs * 3.6).toFixed(0);
                  const statusTooltip = row.compliant
                    ? 'Within DOT regulations (duration <= 11 hours, zero fatigue warnings)'
                    : `Violation: ${row.durationMin > 660 ? 'Exceeded 11-hour driving limit (660 min).' : ''}${row.fatigue > 0 ? ' Fatigue warnings triggered.' : ''}`;
                  return (
                    <tr key={i} className="hover:bg-surface-container/50">
                      <td className="px-3 py-1.5 text-on-surface font-mono text-xs" title={row.userId}>{row.userId.slice(0, 8)}</td>
                      <td className="px-3 py-1.5 text-on-surface whitespace-nowrap" title={new Date(row.startedAt).toLocaleString()}>{new Date(row.startedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5 text-on-surface" title={`${distVal} ${system === 'imperial' ? 'mi' : 'km'} logged`}>{distVal}</td>
                      <td className="px-3 py-1.5 text-on-surface" title={`${row.durationMin} driving minutes logged`}>{row.durationMin}</td>
                      <td className="px-3 py-1.5 text-on-surface" title={`${row.fatigue} fatigue warnings triggered`}>{row.fatigue}</td>
                      <td className="px-3 py-1.5 text-on-surface" title={`${row.nighttimePct} of trip driven at night`}>{row.nighttimePct}</td>
                      <td className="px-3 py-1.5 text-on-surface" title={`Max speed achieved: ${speedVal} ${system === 'imperial' ? 'mph' : 'km/h'}`}>{speedVal}</td>
                      <td className="px-3 py-1.5 text-on-surface capitalize" title={`Weather Risk level: ${row.weather}`}>{row.weather}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap" title={statusTooltip}>
                        {row.compliant ? (
                          <span className="inline-flex items-center rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                            Compliant
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-error/15 px-1.5 py-0.5 text-[10px] font-medium text-error">
                            Violation
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dotRows.length > 25 && (
              <p className="px-3 py-2 text-xs text-on-surface-variant border-t border-outline-variant">
                {t('webComplianceShowingN', { shown: 25, total: dotRows.length })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custom reports */}
      <div className="bg-surface border border-outline rounded-lg p-sz-lg md:p-sz-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning-container text-warning">
            <Mail className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceNeedCustom')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceNeedCustomDesc')}</p>
            <a href="mailto:support@crewradr.app"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container">
              <Mail className="h-4 w-4" /> {t('webComplianceContactSupport')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
