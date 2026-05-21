import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { OrgAppShell } from '@/components/org-app-shell';
import { requireUser } from '@/lib/session';

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser({ kind: 'staff', locale });
  if (user.isPlatformAdmin) {
    redirect({ href: '/platform/organizations', locale: locale as 'ar' | 'fr' | 'en' });
    throw new Error('redirected');
  }
  return (
    <OrgAppShell
      user={{ fullName: user.fullName, email: user.email }}
      organizationName={user.organization?.legalName}
      lockedDepartmentId={user.departmentId ?? null}
    >
      {children}
    </OrgAppShell>
  );
}
