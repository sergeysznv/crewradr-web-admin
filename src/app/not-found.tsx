// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] p-8">
      <div className="max-w-sm text-center">
        <p className="text-6xl font-extrabold text-[var(--brand-seed)] opacity-40">404</p>
        <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/fleet"
          className="mt-6 inline-block rounded-xl bg-[var(--brand-seed)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
