export type CrewTier = 'deckhand' | 'first_mate' | 'captain' | 'admiral';

export interface CrewSummary {
  crew_id: string;
  crew_name: string;
  role: string;
  joined_at: string;
  tier: CrewTier;
  expires_at?: string | null;
}

export interface CrewMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string;
  email: string;
  profile_emoji?: string;
  trips_30d: number;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actor_name: string;
  actor_email: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FleetDashboard {
  crew_name?: string;
  member_count: number;
  active_trips: number;
  recent_alerts: AlertEntry[];
}

export interface AlertEntry {
  message: string;
  severity: 'info' | 'warning' | 'critical';
  display_name: string;
  created_at: string;
}

export interface BrandingData {
  id?: string;
  seed_color?: number;
  accent_color?: number;
  sand_accent_color?: number;
  surface_tint_color?: number;
  logo_url?: string;
}

export interface SubscriptionData {
  tier: string;
  status: string;
  billing_interval?: string;
  max_capacity?: number;
  created_at?: string;
  updated_at?: string;
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

export interface FleetTrend {
  day: string;
  trip_count: number;
}

export interface LivePosition {
  user_id: string;
  display_name: string;
  profile_emoji?: string | null;
  avatar_url?: string | null;
  role: string;
  latitude: number;
  longitude: number;
  event_type: string;
  created_at: string;
}

export interface AccountProfile {
  user_id: string;
  display_name: string;
  email: string;
  language_preference?: string;
  profile_emoji?: string;
  profile_type?: string;
  created_at: string;
}
