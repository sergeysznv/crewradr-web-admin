import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountProfile, FleetDashboard, CrewMembersResponse,
  BulkImportResult, CrewSettings, AuditLogsResponse, UpdateMemberRoleResult, LivePosition
} from '@/types/rpc';
import type { TripDetail } from '@/types/tier';

type RpcFn = SupabaseClient['rpc'];

export async function getAccountProfile(supabase: SupabaseClient): Promise<AccountProfile> {
  const { data, error } = await supabase.rpc('get_web_account_profile').single<AccountProfile>();
  if (error) throw error;
  return data;
}

export async function getFleetDashboard(supabase: SupabaseClient, crewId: string): Promise<FleetDashboard> {
  const { data, error } = await supabase.rpc('get_web_fleet_dashboard', { p_crew_id: crewId }).single<FleetDashboard>();
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
