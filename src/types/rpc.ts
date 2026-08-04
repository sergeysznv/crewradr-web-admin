export interface AccountProfile {
  profile: { user_id: string; display_name: string; email: string; avatar_url: string | null; language_preference: string; profile_emoji: string | null; profile_type: string; created_at: string } | null;
  crews: Array<{ crew_id: string; role: string; joined_at: string; crew_name: string; tier: string }>;
}

export interface FleetDashboard {
  crew_name: string;
  member_count: number;
  active_trips: number;
  recent_alerts: Array<{ id: string; alert_type: string; severity: string; message: string; created_at: string; display_name: string | null }>;
}

export interface CrewMember {
  id: string;           // crew_members.id surrogate
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_emoji: string | null;
  trips_30d: number;
}

export interface CrewMembersResponse {
  members: CrewMember[];
  total: number;
  offset: number;
  limit: number;
}

export interface BulkImportResult {
  added: number;
  errors: Array<{ email: string; error: string }>;
}

export interface CrewSettings {
  branding: { seed_color: string | null; logo_url: string | null } | null;
  subscription: { tier: string; status: string; current_period_end: string | null } | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  offset: number;
  limit: number;
}

export interface UpdateMemberRoleResult {
  member_id: string;
  old_role: string;
  new_role: string;
}
