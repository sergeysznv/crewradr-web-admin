import type { CrewTier } from '@/types/tier';
import { tierHistoryDays } from '@/lib/tier';

/**
 * Effective history depth = min(tier default, configured retention policy).
 * The backend returns the configured policy as-is (COALESCE(policy,
 * tier_default)), so the clamp must happen client-side to honor the privacy
 * contract: a Captain (90d default) who sets retention to 30d must only ever
 * see 30 days of data.
 */
export function effectiveHistoryDays(
  tier: CrewTier,
  retentionPolicyDays: number | null
): number {
  const base = tierHistoryDays(tier);
  if (retentionPolicyDays === null || retentionPolicyDays === undefined) return base;
  return Math.min(base, retentionPolicyDays);
}

/**
 * Visibility filter for per-member location sharing.
 * - Self is always visible
 * - Members with is_invisible (ghost) are never visible to others
 * - Per-member sharing flag wins when configured; otherwise default visible
 */
export function isMemberVisible(
  viewerId: string,
  targetMemberId: string,
  perMemberSharing: Record<string, boolean>,
  invisibleMembers: string[]
): boolean {
  // Self is always visible
  if (viewerId === targetMemberId) return true;
  // Invisible members hidden
  if (invisibleMembers.includes(targetMemberId)) return false;
  // Check per-member sharing — default to visible if not configured
  if (perMemberSharing[targetMemberId] !== undefined) {
    return perMemberSharing[targetMemberId];
  }
  return true;
}
