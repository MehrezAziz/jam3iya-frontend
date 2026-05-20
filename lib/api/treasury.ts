import { api } from './client';

export interface DepartmentBalance {
  departmentId: string;
  departmentName: string;
  donationsMinor: number;
  transfersInMinor: number;
  transfersOutMinor: number;
  distributionsCashMinor: number;
  availableBalanceMinor: number;
}

export interface DepartmentTransfer {
  id: string;
  fromDepartmentId: string;
  fromDepartmentName: string;
  toDepartmentId: string;
  toDepartmentName: string;
  amountMinor: number;
  currency: string;
  notes: string | null;
  createdAt: string;
}

export function getDepartmentBalance(departmentId?: string) {
  const qs = departmentId ? `?departmentId=${departmentId}` : '';
  return api<DepartmentBalance>(`/treasury/balance${qs}`);
}

export function listDepartmentBalances() {
  return api<DepartmentBalance[]>('/treasury/balances');
}

export function listDepartmentTransfers(limit = 50) {
  return api<DepartmentTransfer[]>(`/treasury/transfers?limit=${limit}`);
}

export function createDepartmentTransfer(input: {
  fromDepartmentId: string;
  toDepartmentId: string;
  amountMinor: number;
  notes?: string;
}) {
  return api<DepartmentTransfer>('/treasury/transfers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function canManageTransfers() {
  return api<{ allowed: boolean }>('/treasury/can-transfer');
}
