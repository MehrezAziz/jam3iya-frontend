import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/session';

export default async function DonorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser({ kind: 'donor', locale });
  return (
    <AppShell kind="donor" user={{ fullName: user.fullName, email: user.email }}>
      {children}
    </AppShell>
  );
}
