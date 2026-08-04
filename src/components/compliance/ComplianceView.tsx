// src/components/compliance/ComplianceView.tsx
'use client';
import { useState } from 'react';
import { useT } from '@/hooks/use-translations';
import { useCrew } from '@/hooks/useCrew';
import { useSupabase } from '@/hooks/useSupabase';
import { useSnackbar } from '@/components/shared/Snackbar';
import { tierRank } from '@/lib/utils';
import { FileText, Download, Loader2, Check, Mail, Lock } from 'lucide-react';

export function ComplianceView() {
  const { t } = useT();
  const { crewId, tier } = useCrew();
  const supabase = useSupabase();
  const { showError } = useSnackbar();
  const [genOsha, setGenOsha] = useState(false);
  const [genEld, setGenEld] = useState(false);
  const [lastGen, setLastGen] = useState('');

  const isAdmiral = tierRank(tier) >= 3;

  async function generateOsha() {
    setGenOsha(true);
    try {
      if (!crewId) return;
      const since = new Date();
      since.setFullYear(since.getFullYear() - 1);
      const { data: incidents, error } = await supabase
        .from('safety_alerts')
        .select()
        .eq('crew_id', crewId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });
      if (error) { showError(error.message); return; }
      const rows = (incidents ?? []).map((i: { created_at: string; alert_type: string; severity: string; message: string; target_user_id?: string | null }) =>
        [i.created_at, i.alert_type, i.severity, i.message, i.target_user_id ?? ''].join(','));
      const csv = ['Date,Type,Severity,Description,Subject', ...rows].join('\n');
      download(`osha-300-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
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
      const rows = (sessions ?? []).map((s: { user_id: string; started_at: string; driving_seconds?: number; distance_m?: number; fatigue_warnings?: number }) =>
        [s.user_id, s.started_at, (s.driving_seconds ?? 0) / 3600, (s.distance_m ?? 0) / 1000, s.fatigue_warnings ?? 0].join(','));
      const csv = ['Driver,Date,DrivingHours,DistanceKm,FatigueWarnings', ...rows].join('\n');
      download(`eld-report-crew-${new Date().toISOString().split('T')[0]}.csv`, csv);
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
    <div className="max-w-3xl space-y-lg animate-fade-in">
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

      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceOshaTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceOshaDesc')}</p>
            <button onClick={generateOsha} disabled={genOsha}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
              {genOsha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {genOsha ? t('webComplianceGenerating') : t('webComplianceGenerateOsha')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-surface">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-on-surface">{t('webComplianceEldTitle')}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t('webComplianceEldDesc')}</p>
            <button onClick={generateEld} disabled={genEld}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50">
              {genEld ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {genEld ? t('webComplianceGenerating') : t('webComplianceGenerateEld')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline rounded-lg p-lg md:p-xl">
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
