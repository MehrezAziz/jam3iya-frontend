import { api } from './client';

export interface DonorSearchHit {
  id: string;
  fullName: string;
  phone: string | null;
  email: string;
  fiscalId: string | null;
  acceptsTaxReceipt: boolean;
}

export function searchDonors(q: string, limit = 10) {
  const sp = new URLSearchParams({ q, limit: String(limit) });
  return api<DonorSearchHit[]>(`/donors/search?${sp}`);
}

export function createDonorAccount(input: {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  fiscalId?: string;
  acceptsTaxReceipt?: boolean;
}) {
  return api<{ id: string; email: string; phone: string | null; fullName: string }>(
    '/donors/accounts',
    { method: 'POST', body: JSON.stringify(input) },
  );
}
