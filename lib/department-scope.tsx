'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface DepartmentScopeValue {
  /** When set, the user is scoped to this department and must not change it in forms. */
  lockedDepartmentId: string | null;
}

const DepartmentScopeContext = createContext<DepartmentScopeValue>({
  lockedDepartmentId: null,
});

export function DepartmentScopeProvider({
  lockedDepartmentId,
  children,
}: {
  lockedDepartmentId: string | null;
  children: ReactNode;
}) {
  return (
    <DepartmentScopeContext.Provider value={{ lockedDepartmentId }}>
      {children}
    </DepartmentScopeContext.Provider>
  );
}

export function useDepartmentScope(): DepartmentScopeValue {
  return useContext(DepartmentScopeContext);
}
