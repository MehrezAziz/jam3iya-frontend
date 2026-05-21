'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { refresh } from '@/lib/api/auth';

function hasRefreshCookie(): boolean {
  return typeof document !== 'undefined' && document.cookie.includes('refresh_token=');
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!hasRefreshCookie()) return;
    refresh().catch(() => undefined);
  }, []);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
