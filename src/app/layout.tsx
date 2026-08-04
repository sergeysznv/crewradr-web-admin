import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import '@/app/globals.css';

export const metadata: Metadata = { title: 'CrewRadr Admin', description: 'Fleet management dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
      </head>
      <body className="font-body text-on-surface bg-scaffold antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
