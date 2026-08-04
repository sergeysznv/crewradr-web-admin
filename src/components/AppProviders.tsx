'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CrewProvider } from '@/hooks/useCrew';
import { CrewLoader } from '@/components/CrewLoader';
import { SnackbarProvider } from '@/components/shared/Snackbar';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <CrewProvider>
        <CrewLoader>
          <SnackbarProvider>
            {children}
          </SnackbarProvider>
        </CrewLoader>
      </CrewProvider>
    </QueryClientProvider>
  );
}
