export type CrewTier = 'deckhand' | 'first_mate' | 'captain' | 'admiral';

export interface CrewSummary {
  crew_id: string;
  crew_name: string;
  role: string;
  joined_at: string;
  tier: CrewTier;
  expires_at?: string | null;
}
