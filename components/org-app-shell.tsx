'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { DepartmentScopeProvider } from '@/lib/department-scope';

export function OrgAppShell({
  user,
  organizationName,
  lockedDepartmentId,
  children,
}: {
  user: { fullName: string; email: string };
  organizationName?: string;
  lockedDepartmentId: string | null;
  children: ReactNode;
}) {
  return (
    <DepartmentScopeProvider lockedDepartmentId={lockedDepartmentId}>
      <AppShell kind="staff" user={user} brandTitle={organizationName}>
        {children}
      </AppShell>
    </DepartmentScopeProvider>
  );
}
