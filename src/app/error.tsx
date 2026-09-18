'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions
    console.error('Unhandled web-admin dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-scaffold text-on-surface">
      <div className="max-w-md w-full rounded-2xl border border-outline/30 bg-surface p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error/15 text-error">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          An unexpected error interrupted this view. Your fleet data remains safe in Supabase.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs font-mono text-on-surface-variant/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary transition hover:bg-primary-hover shadow-sm"
          >
            Try Again
          </button>
          <Link
            href="/map"
            className="rounded-xl border border-outline/40 px-5 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-variant/40 transition"
          >
            Return to Live Map
          </Link>
        </div>
      </div>
    </div>
  );
}
