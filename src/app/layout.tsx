import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';


import { TierProvider } from '@/hooks/useTier';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'CrewRadr Admin',
  description: 'Fleet management dashboard',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo-96.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('crewradr-theme')||'system';var d=t==='system'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',d)}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
      </head>
      <body className="font-body text-on-surface bg-scaffold antialiased">
        <AppProviders>
          <TierProvider>
            {children}
          </TierProvider>
        </AppProviders>
      </body>
    </html>
  );
}
