export interface AccountProfile {
  profile: { user_id: string; display_name: string; email: string; avatar_url: string | null; language_preference: string; profile_emoji: string | null; profile_type: string; created_at: string; measurement_system?: 'metric' | 'imperial' | null; font_scale?: number | null } | null;
  crews: Array<{ crew_id: string; role: string; joined_at: string; crew_name: string; tier: string }>;
}

export interface FleetDashboardTripStats {
  total_trips: number;
  total_distance_km: number;
  total_driving_hours: number;
  total_fatigue_warnings: number;
  avg_score: number | null;
}

export interface FleetDashboard {
  crew_name: string;
  member_count: number;
  active_trips: number;
  total_alert_count: number;
  effective_days: number;
  recent_alerts: Array<{ id: string; alert_type: string; severity: string; message: string; created_at: string; display_name: string | null }>;
  trip_stats: FleetDashboardTripStats;
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
  // seed_color arrives as an ARGB bigint (JSON number) from the RPC; hex
  // strings are tolerated for legacy rows.
  branding: { seed_color: string | number | null; logo_url: string | null } | null;
  subscription: { tier: string; status: string; billing_interval: string | null; max_capacity: number; created_at: string; updated_at: string } | null;
  // Reserved: the backend returns sso_enabled: true when SSO is available
  // for this crew. The Settings UI keeps the SSO tab hidden until then.
  sso_enabled?: boolean;
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

export interface LivePosition {
  user_id: string;
  display_name: string | null;
  profile_emoji: string | null;
  avatar_url: string | null;
  role: string;
  latitude: number;
  longitude: number;
  event_type: string | null;
  created_at: string;
}

export interface ProvisioningLink {
  id: string;
  code: string;
  status: string;
  usage_count: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
}

export interface PrivacySettings {
  retentionDays: number;
  perMemberSharing: Record<string, boolean>;
  invisibleMembers: string[];
}

export interface PersonalExport {
  exportedAt: string;
  format: string;
  profile: Array<Record<string, unknown>>;
  trips: Array<Record<string, unknown>>;
  checkIns: Array<Record<string, unknown>>;
}

export interface DeleteAccountResult {
  status: string;
  userId: string;
}
