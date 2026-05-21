import type { ReactNode } from 'react';
import { AuthPageHeader } from '@/components/auth-page-header';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
