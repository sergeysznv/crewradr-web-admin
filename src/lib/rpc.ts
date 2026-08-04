import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountProfile, FleetDashboard, CrewMembersResponse,
  BulkImportResult, CrewSettings, AuditLogsResponse, UpdateMemberRoleResult
} from '@/types/rpc';

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
