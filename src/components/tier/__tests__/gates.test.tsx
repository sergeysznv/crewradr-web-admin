import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const state = vi.hoisted(() => ({
  tier: { tier: 'deckhand', settings: null as unknown, isLoading: false },
  crew: { role: '' },
}));

vi.mock('@/hooks/useTier', () => ({ useTier: () => state.tier }));
vi.mock('@/hooks/useCrew', () => ({ useCrew: () => state.crew }));

import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { RoleGate } from '@/components/tier/RoleGate';

afterEach(cleanup);

const body = <div>secret</div>;
const fb = <div>locked</div>;

describe('TierGateGuard', () => {
  beforeEach(() => {
    state.tier = { tier: 'deckhand', settings: null, isLoading: false };
  });

  it('hides content below the minimum tier', () => {
    state.tier = { tier: 'firstMate', settings: null, isLoading: false };
    render(<TierGateGuard minTier="captain" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText('locked')).toBeTruthy();
  });

  it('shows content at or above the minimum tier', () => {
    state.tier = { tier: 'admiral', settings: null, isLoading: false };
    render(<TierGateGuard minTier="captain" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.getByText('secret')).toBeTruthy();
  });

  it('never renders gated content while settings are loading', () => {
    state.tier = { tier: 'admiral', settings: null, isLoading: true };
    render(<TierGateGuard minTier="admiral" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('fails CLOSED when a feature flag is required but settings are missing', () => {
    state.tier = { tier: 'admiral', settings: null, isLoading: false };
    render(<TierGateGuard requireFeature="canUseApiAccess" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText('locked')).toBeTruthy();
  });

  it('opens when the required feature flag is true', () => {
    state.tier = {
      tier: 'admiral',
      settings: { features: { canUseApiAccess: true } },
      isLoading: false,
    };
    render(<TierGateGuard requireFeature="canUseApiAccess" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.getByText('secret')).toBeTruthy();
  });

  it('stays closed when the required feature flag is false', () => {
    state.tier = {
      tier: 'admiral',
      settings: { features: { canUseApiAccess: false } },
      isLoading: false,
    };
    render(<TierGateGuard requireFeature="canUseApiAccess" fallback={fb}>{body}</TierGateGuard>);
    expect(screen.queryByText('secret')).toBeNull();
  });
});

describe('RoleGate', () => {
  it.each(['captain', 'co-captain', 'co_captain'])('allows %s', (role) => {
    state.crew = { role };
    render(<RoleGate fallback={fb}>{body}</RoleGate>);
    expect(screen.getByText('secret')).toBeTruthy();
  });

  it('denies a plain member', () => {
    state.crew = { role: 'member' };
    render(<RoleGate fallback={fb}>{body}</RoleGate>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText('locked')).toBeTruthy();
  });

  it('shows neither content nor fallback while the role is unknown', () => {
    state.crew = { role: '' };
    render(<RoleGate fallback={fb}>{body}</RoleGate>);
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.queryByText('locked')).toBeNull();
  });
});
