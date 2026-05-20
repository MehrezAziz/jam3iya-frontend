import { api } from './client';

export interface DonationItem {
  id: string;
  kind: 'cash' | 'card' | 'bank_transfer' | 'gateway' | 'in_kind';
  amountMinor: number;
  currency: string;
  receivedAt: string;
  donorId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  occasionId: string | null;
  spendCategory: string | null;
  isAnonymous: boolean;
  donorNameSnapshot: string | null;
  departmentId: string | null;
  departmentName: string | null;
  notes: string | null;
  receiptBill: {
    id: string;
    number: string;
    series: string;
    yearIssued: number;
  } | null;
}

export interface ListDonationsParams {
  limit?: number;
  offset?: number;
  kind?: DonationItem['kind'];
  campaignIds?: string[];
  spendCategories?: string[];
  from?: string;
  to?: string;
  departmentId?: string;
}

export function listDonations(params: ListDonationsParams = {}) {
  const sp = new URLSearchParams();
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.kind) sp.set('kind', params.kind);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.departmentId) sp.set('departmentId', params.departmentId);
  params.campaignIds?.forEach((id) => sp.append('campaignIds', id));
  params.spendCategories?.forEach((c) => sp.append('spendCategories', c));
  const qs = sp.toString();
  return api<{ total: number; items: DonationItem[]; limit: number; offset: number }>(
    `/donations${qs ? `?${qs}` : ''}`,
  );
}

export function donationStats() {
  return api('/donations/stats');
}

export function createCashDonation(input: {
  amount: number;
  currency?: string;
  donorId?: string;
  campaignId?: string;
  occasionId?: string;
  spendCategory?: string;
  receivedAt?: string;
  donorNameSnapshot?: string;
  donorFiscalIdSnapshot?: string;
  isAnonymous?: boolean;
  notes?: string;
}) {
  return api('/donations/cash', { method: 'POST', body: JSON.stringify(input) });
}
