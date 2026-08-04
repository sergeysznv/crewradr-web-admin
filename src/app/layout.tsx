import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import { AuthGuard } from '@/components/AuthGuard';
import '@/app/globals.css';

export const metadata: Metadata = { title: 'CrewRadr Admin', description: 'Fleet management dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="font-body text-on-surface bg-scaffold antialiased">
        <AppProviders>
          <AuthGuard>{children}</AuthGuard>
        </AppProviders>
      </body>
    </html>
  );
}
