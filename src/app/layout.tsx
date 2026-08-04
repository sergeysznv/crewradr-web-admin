import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import '@/app/globals.css';

export const metadata: Metadata = { title: 'CrewRadr Admin', description: 'Fleet management dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="font-body text-on-surface bg-scaffold antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
