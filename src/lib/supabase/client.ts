import { createClient } from '@supabase/supabase-js';

// Production Supabase config (ported from web admin master).
// Hardcoded URL + anon key, passkey experimental enabled, dedicated
// storage key, session detection disabled (no OAuth redirect flow).
export const supabase = createClient(
  'https://amtxzeryaoqdfoadsjsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtdHh6ZXJ5YW9xZGZvYWRzanNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxODU5MTcsImV4cCI6MjA5MDc2MTkxN30.LvFDLt1KKd535Hq22LYL8Eyig-iCUSQ3r4Z7-_H5_oA',
  {
    auth: {
      experimental: { passkey: true },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'crewradr-auth',
    },
  }
);
