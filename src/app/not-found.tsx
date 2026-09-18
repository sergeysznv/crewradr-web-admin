'use client';

import Link from 'next/link';
import { useT } from '@/hooks/use-translations';

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-scaffold text-on-surface">
      <div className="max-w-md w-full rounded-2xl border border-outline/30 bg-surface p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <span className="text-2xl font-black">404</span>
        </div>

        <h1 className="text-xl font-bold tracking-tight">
          {t('webNotFoundTitle')}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t('webNotFoundDesc')}
        </p>

        <div className="mt-6">
          <Link
            href="/map"
            className="inline-block rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary transition hover:bg-primary-hover shadow-sm"
          >
            {t('webNotFoundCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
