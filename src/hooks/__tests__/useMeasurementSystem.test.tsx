import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'crewradr_measurement_system';

const supabaseMock = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  const subscribe = vi.fn();
  const on = vi.fn(() => ({ subscribe }));
  const channel = vi.fn(() => ({ on }));
  return {
    upsert,
    from,
    subscribe,
    on,
    channel,
    supabase: { from, channel },
  };
});

type MockProfile = {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  language_preference: string;
  profile_emoji: string | null;
  profile_type: string;
  created_at: string;
  measurement_system?: 'metric' | 'imperial' | null;
};

const profileState = vi.hoisted(() => ({
  profile: null as MockProfile | null,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock.supabase,
}));

vi.mock('@/hooks/useSupabase', () => ({
  useSupabase: () => supabaseMock.supabase,
}));

vi.mock('@/hooks/queries/useAccountProfile', () => ({
  useAccountProfile: () => ({ data: { profile: profileState.profile, crews: [] } }),
}));

import { useMeasurementSystem } from '@/hooks/useMeasurementSystem';

const BASE_PROFILE: MockProfile = {
  user_id: 'user-1',
  display_name: 'Test User',
  email: 'test@crewradr.app',
  avatar_url: null,
  language_preference: 'en',
  profile_emoji: '🚀',
  profile_type: 'personal',
  created_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMeasurementSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.upsert.mockResolvedValue({ error: null });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('gives the profile measurement_system top priority', () => {
    localStorage.setItem(STORAGE_KEY, 'metric');
    profileState.profile = { ...BASE_PROFILE, measurement_system: 'imperial' };

    const { result } = renderHook(() => useMeasurementSystem());

    expect(result.current.system).toBe('imperial');
  });

  it('uses the localStorage cache when profile has no measurement_system', () => {
    localStorage.setItem(STORAGE_KEY, 'imperial');
    profileState.profile = null;

    const { result } = renderHook(() => useMeasurementSystem());

    expect(result.current.system).toBe('imperial');
  });

  it('derives from the browser locale when profile and cache are absent', () => {
    profileState.profile = null;
    const prev = Object.getOwnPropertyDescriptor(window.navigator, 'language');
    Object.defineProperty(window.navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });

    const { result } = renderHook(() => useMeasurementSystem());

    expect(result.current.system).toBe('metric');

    if (prev) {
      Object.defineProperty(window.navigator, 'language', prev);
    } else {
      delete (window.navigator as unknown as Record<string, unknown>).language;
    }
  });

  it('setAndSync upserts the profile and updates the local cache', async () => {
    profileState.profile = { ...BASE_PROFILE, measurement_system: 'metric' };
    const { result } = renderHook(() => useMeasurementSystem());

    await act(async () => {
      await result.current.setAndSync('imperial');
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMock.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', measurement_system: 'imperial' },
      { onConflict: 'user_id' },
    );
    expect(result.current.system).toBe('imperial');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('imperial');
  });

  it('reverts the optimistic update when the upsert fails', async () => {
    profileState.profile = { ...BASE_PROFILE, measurement_system: 'metric' };
    supabaseMock.upsert.mockResolvedValue({ error: new Error('sync failed') });
    const { result } = renderHook(() => useMeasurementSystem());

    await act(async () => {
      await result.current.setAndSync('imperial');
    });

    expect(result.current.system).toBe('metric');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('metric');
  });
});
