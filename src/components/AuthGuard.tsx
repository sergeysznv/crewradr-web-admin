// src/components/AuthGuard.tsx
'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

export function AuthGuard({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      } else {
        setReady(true);
      }
    });
  }, [supabase]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-scaffold">
        <div className="text-on-surface-variant text-sm">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
