import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { AuthPageHeader } from '@/components/auth-page-header';
import { getPostLoginPath } from '@/lib/auth-routes';
import { getCurrentUser } from '@/lib/session';

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: getPostLoginPath(user), locale: locale as 'ar' | 'fr' | 'en' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
