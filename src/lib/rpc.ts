import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountProfile, FleetDashboard, CrewMembersResponse,
  BulkImportResult, CrewSettings, AuditLogsResponse, UpdateMemberRoleResult, LivePosition,
  PrivacySettings, PersonalExport, DeleteAccountResult
} from '@/types/rpc';
import type {
  AlertRule, TripDetail, TripListItem, TrendDataPoint, ReportTemplate, ReportWidget,
  ScheduledReport, RiskPrediction, Anomaly, FleetPolicy
} from '@/types/tier';
import { FLEET_POLICY_DEFAULTS } from '@/types/tier';

type RpcFn = SupabaseClient['rpc'];

export async function getAccountProfile(supabase: SupabaseClient): Promise<AccountProfile> {
  const { data, error } = await supabase.rpc('get_web_account_profile').single<AccountProfile>();
  if (error) throw error;
  return data;
}

export async function getFleetDashboard(supabase: SupabaseClient, crewId: string, days?: number): Promise<FleetDashboard> {
  const { data, error } = await supabase.rpc('get_web_fleet_dashboard', { p_crew_id: crewId, p_days: days ?? 30 }).single<FleetDashboard>();
  if (error) throw error;
  return data;
}

export async function getCrewMembers(
  supabase: SupabaseClient,
  crewId: string,
  search?: string | null,
  offset?: number,
  limit?: number
): Promise<CrewMembersResponse> {
  const { data, error } = await supabase.rpc('get_web_crew_members', {
    p_crew_id: crewId, p_search: search ?? null, p_offset: offset ?? 0, p_limit: limit ?? 25
  }).single<CrewMembersResponse>();
  if (error) throw error;
  return data;
}

export async function bulkImportMembers(
  supabase: SupabaseClient, crewId: string, members: Array<{ email: string; role: string }>
): Promise<BulkImportResult> {
  const { data, error } = await supabase.rpc('bulk_import_crew_members', {
    p_crew_id: crewId, p_members: members
  }).single<BulkImportResult>();
  if (error) throw error;
  return data;
}

export async function getCrewSettings(supabase: SupabaseClient, crewId: string): Promise<CrewSettings> {
  const { data, error } = await supabase.rpc('get_web_crew_settings', { p_crew_id: crewId }).single<CrewSettings>();
  if (error) throw error;
  return data;
}

export async function getAuditLogs(
  supabase: SupabaseClient, crewId: string,
  dateFrom?: string | null, dateTo?: string | null,
  action?: string | null, offset?: number, limit?: number
): Promise<AuditLogsResponse> {
  const { data, error } = await supabase.rpc('get_web_audit_logs', {
    p_crew_id: crewId,
    p_date_from: dateFrom ?? null, p_date_to: dateTo ?? null,
    p_action: action ?? null, p_offset: offset ?? 0, p_limit: limit ?? 25
  }).single<AuditLogsResponse>();
  if (error) throw error;
  return data;
}

export async function updateMemberRole(
  supabase: SupabaseClient, memberId: string, newRole: string
): Promise<UpdateMemberRoleResult> {
  const { data, error } = await supabase.rpc('update_member_role', {
    p_member_id: memberId, p_new_role: newRole
  }).single<UpdateMemberRoleResult>();
  if (error) throw error;
  return data;
}

export async function getTripDetail(supabase: SupabaseClient, tripId: string): Promise<TripDetail> {
  const { data, error } = await supabase.rpc('get_web_trip_detail', { p_trip_id: tripId }).single<TripDetail>();
  if (error) throw error;
  return data;
}

/** Crew trip list, tier-clamped server-side (7/30/90/365 days). */
export async function getWebTripList(
  supabase: SupabaseClient,
  crewId: string,
  days = 30,
  memberId?: string | null,
): Promise<TripListItem[]> {
  const params: Record<string, unknown> = {
    p_crew_id: crewId,
    p_days: days,
  };
  if (memberId) params.p_member_id = memberId;
  const { data, error } = await supabase.rpc('get_web_trip_list', params);
  if (error) throw error;
  return (data as TripListItem[]) ?? [];
}

export type TrendMetric = 'miles' | 'hours' | 'alerts';

export async function getWebTrendData(
  supabase: SupabaseClient,
  crewId: string,
  metric: TrendMetric,
  days: number,
): Promise<TrendDataPoint[]> {
  const { data, error } = await supabase.rpc('get_web_trend_data', {
    p_crew_id: crewId,
    p_metric: metric,
    p_days: days,
  });
  if (error) throw error;
  return (data as TrendDataPoint[]) ?? [];
}

export async function getLivePositions(supabase: SupabaseClient, crewId: string): Promise<LivePosition[]> {
  const { data, error } = await supabase.rpc('get_web_live_positions', { p_crew_id: crewId });
  if (error) throw error;
  // The RPC returns { positions: [...], crew_name } — return the array.
  return (data as { positions?: LivePosition[] } | null)?.positions ?? [];
}

/**
 * Persists crew branding. There is no authenticated branding RPC
 * (save_crew_branding is service-role only), so — like the production web
 * admin and the mobile app — we upsert the crew_branding row directly.
 * The captain-write RLS policy gates this client-side.
 */
export async function updateCrewBranding(
  supabase: SupabaseClient,
  crewId: string,
  seedColor: string,
  logoUrl?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('crew_branding')
    .upsert(
      {
        crew_id: crewId,
        seed_color: hexToArgb(seedColor),
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      },
      { onConflict: 'crew_id' },
    );
  if (error) throw error;
}

/** '#RRGGBB' → 0xFFRRGGBB (crew_branding stores ARGB bigint values). */
function hexToArgb(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt('FF' + cleaned, 16);
}

export async function removeMember(supabase: SupabaseClient, memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', { p_member_id: memberId });
  if (error) throw error;
}

export async function transferCaptaincy(supabase: SupabaseClient, crewId: string, newCaptainUserId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_crew_captaincy', { p_crew_id: crewId, p_new_captain_id: newCaptainUserId });
  if (error) throw error;
}

export async function dissolveCrew(supabase: SupabaseClient, crewId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('dissolve_crew', { crew_id: crewId });
  if (error) throw error;
  return data as boolean;
}

export async function getReportTemplates(supabase: SupabaseClient, crewId: string): Promise<ReportTemplate[]> {
  const { data, error } = await supabase.rpc('get_report_templates', { p_crew_id: crewId });
  if (error) throw error;
  return (data as ReportTemplate[]) ?? [];
}

export async function saveReportTemplate(
  supabase: SupabaseClient,
  crewId: string,
  template: { id?: string; name: string; widgets: ReportWidget[] },
): Promise<string> {
  const { data, error } = await supabase.rpc('save_report_template', {
    p_crew_id: crewId,
    p_template: template,
  });
  if (error) throw error;
  return data as string;
}

export interface ScheduledReportInput {
  id?: string;
  templateId: string;
  schedule: string;
  format: 'pdf' | 'csv';
  recipients: string[];
  enabled: boolean;
}

export async function getScheduledReports(
  supabase: SupabaseClient,
  crewId: string,
): Promise<ScheduledReport[]> {
  const { data, error } = await supabase.rpc('get_scheduled_reports', { p_crew_id: crewId });
  if (error) throw error;
  return (data as ScheduledReport[]) ?? [];
}

export async function saveScheduledReport(
  supabase: SupabaseClient,
  crewId: string,
  schedule: ScheduledReportInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('save_scheduled_report', {
    p_crew_id: crewId,
    p_schedule: schedule,
  });
  if (error) throw error;
  return data as string;
}

export async function getAlertRules(supabase: SupabaseClient, crewId: string): Promise<AlertRule[]> {
  const { data, error } = await supabase.rpc('get_alert_rules', { p_crew_id: crewId });
  if (error) throw error;
  return (data as AlertRule[]) ?? [];
}

export async function getWebRiskPredictions(
  supabase: SupabaseClient,
  crewId: string,
): Promise<RiskPrediction[]> {
  const { data, error } = await supabase.rpc('get_web_risk_predictions', { p_crew_id: crewId });
  if (error) throw error;
  return (data as RiskPrediction[]) ?? [];
}

export async function getWebAnomalies(
  supabase: SupabaseClient,
  crewId: string,
  days = 30,
): Promise<Anomaly[]> {
  const { data, error } = await supabase.rpc('get_web_anomalies', {
    p_crew_id: crewId,
    p_days: days,
  });
  if (error) throw error;
  return (data as Anomaly[]) ?? [];
}

export async function saveAlertRule(
  supabase: SupabaseClient,
  crewId: string,
  rule: { id?: string; name: string; conditions: AlertRule['conditions']; enabled: boolean },
): Promise<string> {
  const { data, error } = await supabase.rpc('save_alert_rule', {
    p_crew_id: crewId,
    p_rule: rule,
  });
  if (error) throw error;
  return data as string;
}

export async function getFleetPolicy(supabase: SupabaseClient, crewId: string): Promise<FleetPolicy> {
  const { data, error } = await supabase.rpc('get_web_fleet_policy', { p_crew_id: crewId });
  if (error) throw error;
  return (data as FleetPolicy) ?? { ...FLEET_POLICY_DEFAULTS };
}

export async function saveFleetPolicy(
  supabase: SupabaseClient,
  crewId: string,
  policy: Partial<FleetPolicy>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('save_web_fleet_policy', {
    p_crew_id: crewId,
    p_policy: policy,
  });
  if (error) throw error;
  return data as boolean;
}

/**
 * Reads retention policy + per-member sharing state (captain/co-captain
 * gated server-side). Returns the configured policy as-is — the client
 * clamps it to the tier default via effectiveHistoryDays().
 */
export async function getPrivacySettings(
  supabase: SupabaseClient,
  crewId: string,
): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .rpc('get_web_privacy_settings', { p_crew_id: crewId })
    .single<PrivacySettings>();
  if (error) throw error;
  return data;
}

/** GDPR Art. 20 personal data export (rate-limited server-side: 3/24h). */
export async function getPersonalExport(
  supabase: SupabaseClient,
  format: 'json' | 'csv',
): Promise<PersonalExport> {
  const { data, error } = await supabase
    .rpc('get_web_personal_export', { p_format: format })
    .single<PersonalExport>();
  if (error) throw error;
  return data;
}

/** Deletes the caller's account and all associated data (GDPR Art. 17). */
export async function deleteWebAccount(supabase: SupabaseClient): Promise<DeleteAccountResult> {
  const { data, error } = await supabase
    .rpc('delete_web_account')
    .single<DeleteAccountResult>();
  if (error) throw error;
  return data;
}

/**
 * Persists the crew retention policy. No dedicated write RPC exists, so —
 * like updateCrewBranding — we upsert enterprise_fleet_config directly; the
 * captain-scoped RLS INSERT/UPDATE policies gate this client-side.
 */
export async function updateRetentionDays(
  supabase: SupabaseClient,
  crewId: string,
  days: number,
): Promise<void> {
  const { error } = await supabase
    .from('enterprise_fleet_config')
    .upsert({ crew_id: crewId, audit_retention_days: days }, { onConflict: 'crew_id' });
  if (error) throw error;
}

export interface ComplianceSettings {
  crew_id: string;
  dot_osha_mode: boolean;
  dot_eld_enabled: boolean;
  dot_dvir_enabled: boolean;
  dot_drug_testing_enabled: boolean;
  gdpr_enhanced_mode: boolean;
  gdpr_consent_required: boolean;
  gdpr_retention_days: number;
  gdpr_anonymize_exports: boolean;
  gdpr_breach_notify: boolean;
  duty_cycle_masking_enabled: boolean;
  geofencing_masking_enabled: boolean;
  shift_hours_start: string;
  shift_hours_end: string;
}

export async function getComplianceSettings(
  supabase: SupabaseClient,
  crewId: string,
): Promise<ComplianceSettings> {
  const { data, error } = await supabase
    .from('crew_compliance_settings')
    .select()
    .eq('crew_id', crewId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      crew_id: crewId,
      dot_osha_mode: false,
      dot_eld_enabled: false,
      dot_dvir_enabled: false,
      dot_drug_testing_enabled: false,
      gdpr_enhanced_mode: false,
      gdpr_consent_required: false,
      gdpr_retention_days: 30,
      gdpr_anonymize_exports: true,
      gdpr_breach_notify: false,
      duty_cycle_masking_enabled: false,
      geofencing_masking_enabled: false,
      shift_hours_start: '08:00',
      shift_hours_end: '17:00',
    };
  }
  return data as ComplianceSettings;
}

export async function updateComplianceSettings(
  supabase: SupabaseClient,
  settings: Partial<ComplianceSettings> & { crew_id: string },
): Promise<void> {
  const { error } = await supabase
    .from('crew_compliance_settings')
    .upsert(settings, { onConflict: 'crew_id' });
  if (error) throw error;
}
