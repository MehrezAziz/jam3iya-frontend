import { api } from './client';

export type CampaignState = 'draft' | 'active' | 'closed';

export type BeneficiaryLookupField = 'name' | 'phone' | 'cin' | 'code';

export interface CampaignListEntry {
  id: string;
  name: string;
  description: string | null;
  occasionId: string | null;
  startsAt: string;
  endsAt: string | null;
  targetAmountMinor: number | null;
  collectedAmountMinor: number;
  distributedAmountMinor: number;
  /** Sum of beneficiary split amounts on this campaign. */
  allocatedAmountMinor: number;
  /** Collected minus allocated — not yet assigned to any beneficiary. */
  unassignedAmountMinor: number;
  currency: string;
  state: CampaignState;
  visibleOnPublicPage: boolean;
  beneficiaryLookupFields: BeneficiaryLookupField[];
  occasion: { name: string; isHijriBased: boolean } | null;
}

export interface Occasion {
  id: string;
  name: string;
  description: string | null;
  periodStart: string;
  periodEnd: string | null;
  recurring: boolean;
  recurringRule: string | null;
  isHijriBased: boolean;
}

export function listCampaigns(): Promise<CampaignListEntry[]> {
  return api('/campaigns');
}

export function createCampaign(input: {
  name: string;
  description?: string;
  occasionId?: string;
  startsAt: string;
  endsAt?: string | null;
  targetAmountMinor?: number;
  currency?: string;
  visibleOnPublicPage?: boolean;
  state?: CampaignState;
  beneficiaryLookupFields?: BeneficiaryLookupField[];
}): Promise<{ id: string }> {
  return api('/campaigns', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCampaign(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    occasionId: string | null;
    startsAt: string;
    endsAt: string | null;
    targetAmountMinor: number | null;
    visibleOnPublicPage: boolean;
    state: CampaignState;
    beneficiaryLookupFields: BeneficiaryLookupField[];
  }>,
) {
  return api(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteCampaign(id: string) {
  return api(`/campaigns/${id}`, { method: 'DELETE' });
}

export interface CampaignDonationRow {
  id: string;
  kind: string;
  amountMinor: number;
  currency: string;
  receivedAt: string;
  isAnonymous: boolean;
  donorNameSnapshot: string | null;
  spendCategory: string | null;
}

export function listCampaignDonations(campaignId: string): Promise<{
  campaign: { id: string; name: string };
  items: CampaignDonationRow[];
}> {
  return api(`/campaigns/${campaignId}/donations`);
}

export interface CampaignBeneficiaryEntry {
  linkId: string;
  beneficiaryId: string;
  createdAt: string;
  code: string;
  publicAlias: string | null;
  status: string;
  isOrphan: boolean;
  fullName: string;
  allocatedMinor: number;
  distributedMinor: number;
  hasReceivedPayment: boolean;
}

export function listCampaignBeneficiaries(campaignId: string): Promise<{ items: CampaignBeneficiaryEntry[] }> {
  return api(`/campaigns/${campaignId}/beneficiaries`);
}

export function addCampaignBeneficiary(campaignId: string, beneficiaryId: string) {
  return api(`/campaigns/${campaignId}/beneficiaries`, {
    method: 'POST',
    body: JSON.stringify({ beneficiaryId }),
  });
}

export function quickAddCampaignBeneficiary(
  campaignId: string,
  input: { firstName: string; lastName: string; isOrphan?: boolean },
) {
  return api(`/campaigns/${campaignId}/beneficiaries/quick`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeCampaignBeneficiary(campaignId: string, beneficiaryId: string) {
  return api(`/campaigns/${campaignId}/beneficiaries/${beneficiaryId}`, { method: 'DELETE' });
}

export interface CampaignBeneficiaryAllocationSplit {
  id: string;
  donationId: string;
  amountMinor: number;
  distributedMinor: number;
  pendingMinor: number;
  currency: string;
  paidAt: string | null;
  receivedAt: string;
}

export interface CampaignBeneficiaryAllocation {
  beneficiaryId: string;
  code: string;
  fullName: string;
  isOrphan: boolean;
  allocatedMinor: number;
  distributedMinor: number;
  pendingMinor: number;
  splits: CampaignBeneficiaryAllocationSplit[];
}

export function listCampaignBeneficiaryAllocations(
  campaignId: string,
): Promise<{
  items: CampaignBeneficiaryAllocation[];
  collectedMinor: number;
  allocatedMinor: number;
  unassignedMinor: number;
}> {
  return api(`/campaigns/${campaignId}/beneficiary-allocations`);
}

export function updateCampaignBeneficiarySplit(
  campaignId: string,
  splitId: string,
  amountMinor: number,
) {
  return api(`/campaigns/${campaignId}/beneficiary-splits/${splitId}`, {
    method: 'PATCH',
    body: JSON.stringify({ amountMinor }),
  });
}

export function markCampaignBeneficiarySplitPaid(campaignId: string, splitId: string) {
  return api(`/campaigns/${campaignId}/beneficiary-splits/${splitId}/mark-paid`, {
    method: 'POST',
  });
}

export function unmarkCampaignBeneficiarySplitPaid(campaignId: string, splitId: string) {
  return api(`/campaigns/${campaignId}/beneficiary-splits/${splitId}/unmark-paid`, {
    method: 'POST',
  });
}

export function listOccasions(): Promise<Occasion[]> {
  return api('/occasions');
}

export function createOccasion(input: {
  name: string;
  description?: string;
  periodStart: string;
  periodEnd?: string | null;
  recurring?: boolean;
  recurringRule?: string;
  isHijriBased?: boolean;
}): Promise<{ id: string }> {
  return api('/occasions', { method: 'POST', body: JSON.stringify(input) });
}
