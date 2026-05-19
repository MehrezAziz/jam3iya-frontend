import { api } from './client';

export interface MyDonation {
  id: string;
  organizationId: string;
  kind: 'cash' | 'card' | 'gateway' | 'bank_transfer' | 'in_kind';
  amountMinor: number;
  currency: string;
  receivedAt: string;
  isAnonymous: boolean;
  campaignId: string | null;
  occasionId: string | null;
  inKindQuantity: number | null;
  inKindUnit: string | null;
  inKindEstValueMinor: number | null;
  organization: { legalName: string; slug: string };
}

export interface MyDonationsResult {
  total: number;
  items: MyDonation[];
  limit: number;
  offset: number;
  totalGiven: { currency: string; amountMinor: number }[];
}

export function listMyDonations(): Promise<MyDonationsResult> {
  return api('/donations/mine');
}

export interface MyReceipt {
  id: string;
  number: string;
  series: string;
  issuedAt: string;
  totalMinor: number;
  currency: string;
  organizationId: string;
  isTaxReceipt: boolean;
  linkedDonationId: string | null;
  pdfFileId: string | null;
  organization: { legalName: string; slug: string };
}

export function listMyReceipts(): Promise<MyReceipt[]> {
  return api('/donations/my-receipts');
}
