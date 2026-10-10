import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStitchedTrips, TRIP_STOP_MAX_GAP_SECONDS } from '../rpc';

type Call = { fn: string; args: Record<string, unknown> };

function client(result: { data: unknown; error: unknown }, calls: Call[]) {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
  } as unknown as SupabaseClient;
}

describe('getStitchedTrips', () => {
  it('asks the server for A to B trips with the shared stop gap', async () => {
    const calls: Call[] = [];
    const since = new Date('2026-10-12T00:00:00Z');
    await getStitchedTrips(client({ data: [], error: null }, calls), {
      crewId: 'crew-1',
      userId: 'user-1',
      since,
      limit: 5,
    });
    expect(calls).toEqual([
      {
        fn: 'stitch_trip_sessions',
        args: {
          p_crew_id: 'crew-1',
          p_user_id: 'user-1',
          p_since: since.toISOString(),
          p_limit: 5,
          p_max_gap_seconds: TRIP_STOP_MAX_GAP_SECONDS,
        },
      },
    ]);
    expect(TRIP_STOP_MAX_GAP_SECONDS).toBe(300);
  });

  it('returns the rows and treats null data as empty', async () => {
    const rows = [{ id: 't1' }];
    expect(
      await getStitchedTrips(client({ data: rows, error: null }, []), { crewId: 'c' }),
    ).toEqual(rows);
    expect(await getStitchedTrips(client({ data: null, error: null }, []), { crewId: 'c' })).toEqual([]);
  });

  it('throws the server error', async () => {
    const err = new Error('boom');
    await expect(
      getStitchedTrips(client({ data: null, error: err }, []), { crewId: 'c' }),
    ).rejects.toBe(err);
  });
});
