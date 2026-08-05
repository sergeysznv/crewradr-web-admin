export type CrewTier = 'deckhand' | 'firstMate' | 'captain' | 'admiral';

export interface WebCrewSettingsFeatures {
  canExportData: boolean;
  canUseAdvancedAnalytics: boolean;
  canUseFleetRiskRating: boolean;
  canUseComplianceReports: boolean;
  canUseApiAccess: boolean;
  canUseEnterpriseFleet: boolean;
}

export interface WebCrewSettings {
  crewId: string;
  crewName: string;
  tier: CrewTier;
  historyDays: number;
  features: WebCrewSettingsFeatures;
}

export interface TierContextValue {
  tier: CrewTier;
  settings: WebCrewSettings | null;
  isLoading: boolean;
  error: Error | null;
  graceDaysRemaining: number;
  pendingDowngradeTier: CrewTier | null;
  isOverCapacity: boolean;
  isInLockout: boolean;
}

export interface ScorePoint {
  date: string;
  score: number;
}

export interface ScoreSubscores {
  braking: number;
  speeding: number;
  phoneUse: number;
  nightDriving: number;
}

export interface MemberScorecard {
  memberId: string;
  memberName: string;
  overallScore: number;
  subscores: ScoreSubscores;
  percentileRank: number;
  trend: ScorePoint[];
  periodDays: number;
}

export type AnomalyType = 'route_deviation' | 'unexpected_stop' | 'time_anomaly' | 'speed_anomaly';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  id: string;
  memberId: string;
  memberName: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  timestamp: string;
  tripId: string | null;
}

export type RiskFactorCategory = 'speed' | 'fatigue' | 'weather' | 'route_history';

export interface RiskFactor {
  category: RiskFactorCategory;
  impactScore: number;
  description: string;
}

export interface RiskPrediction {
  memberId: string;
  memberName: string;
  riskScore: number;
  factors: RiskFactor[];
  confidence: number;
}

export interface AlertRule {
  id: string;
  crewId: string;
  name: string;
  conditions: {
    speedMph?: number;
    durationMin?: number;
    zoneIds?: string[];
    timeStart?: string;
    timeEnd?: string;
  };
  enabled: boolean;
  createdAt: string;
}

export interface ReportTemplate {
  id: string;
  crewId: string;
  name: string;
  widgets: ReportWidget[];
  createdAt: string;
}

export interface ReportWidget {
  type: 'metric' | 'chart' | 'table';
  metric?: string;
  memberIds?: string[];
  dateRange?: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TripDetail {
  tripId: string;
  memberId: string;
  memberName: string;
  startTime: string;
  endTime: string | null;
  isLive: boolean;
  polyline: [number, number][];
  speedSamples: { timestamp: string; speedMph: number }[];
  stops: { lat: number; lng: number; durationMin: number; timestamp: string }[];
  alerts: { type: string; timestamp: string; description: string }[];
}
