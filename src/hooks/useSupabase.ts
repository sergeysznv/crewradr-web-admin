'use client';
import { supabase } from '@/lib/supabase/client';

// Singleton client — no factory. Returned directly so callers keep the
// same call shape (supabase.auth, supabase.rpc, ...).
export function useSupabase() {
  return supabase;
}
