import { api } from './client';

export interface BillItem {
  id: string;
  number: string;
  series: string;
  yearIssued: number;
  issuedAt: string;
  totalMinor: number;
  currency: string;
  status: string;
  isTaxReceipt: boolean;
  recipientType: string;
  recipientSnapshot: { name?: string; fiscalId?: string | null };
  linkedDonationId: string | null;
}

export function listBills(params?: { limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  const qs = sp.toString();
  return api<{ total: number; items: BillItem[] }>(`/bills${qs ? `?${qs}` : ''}`);
}

export interface BillPrintDonation {
  id: string;
  kind: string;
  isAnonymous: boolean;
  spendCategory: string | null;
  receivedAt: string;
  donorNameSnapshot: string | null;
  campaignName: string | null;
}

export function getBill(id: string): Promise<
  BillItem & {
    organization: {
      legalName: string;
      fiscalId: string | null;
      address: string | null;
      phone: string | null;
      logoFileId: string | null;
    };
    linkedDonation: BillPrintDonation | null;
  }
> {
  return api(`/bills/${id}`);
}

export function issueDonationReceipt(input: {
  donationId: string;
  recipientName: string;
  recipientFiscalId?: string;
  isTaxReceipt?: boolean;
}) {
  return api<{ id: string; number: string; alreadyExists?: boolean }>('/bills/donation-receipt', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
