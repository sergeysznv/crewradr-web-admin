'use client';

import { useState, useEffect } from 'react';
import { Clock, LogOut } from 'lucide-react';

interface Props {
  staySignedIn: () => void;
  onSignOut: () => void;
}

export function IdleWarningOverlay({ staySignedIn, onSignOut }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    if (secondsLeft <= 0) { onSignOut(); return; }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, onSignOut]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Still here?</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            You&apos;ve been inactive for a while. You&apos;ll be signed out automatically in{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{mins}:{String(secs).padStart(2, '0')}</strong>.
          </p>

          <button
            onClick={staySignedIn}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-seed)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Stay Signed In
          </button>

          <button
            onClick={onSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignedOutOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <LogOut className="h-7 w-7 text-zinc-500" />
          </div>

          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Signed Out</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            You were signed out due to inactivity. Sign in again to continue.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-seed)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}
