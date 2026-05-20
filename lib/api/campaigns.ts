import { api } from './client';

export type CampaignState = 'draft' | 'active' | 'closed';

export interface CampaignListEntry {
  id: string;
  name: string;
  description: string | null;
  occasionId: string | null;
  startsAt: string;
  endsAt: string;
  targetAmountMinor: number | null;
  collectedAmountMinor: number;
  distributedAmountMinor: number;
  currency: string;
  state: CampaignState;
  visibleOnPublicPage: boolean;
  occasion: { name: string; isHijriBased: boolean } | null;
}

export interface Occasion {
  id: string;
  name: string;
  description: string | null;
  periodStart: string;
  periodEnd: string;
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
  endsAt: string;
  targetAmountMinor?: number;
  currency?: string;
  visibleOnPublicPage?: boolean;
  state?: CampaignState;
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
    endsAt: string;
    targetAmountMinor: number | null;
    visibleOnPublicPage: boolean;
    state: CampaignState;
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

export function listOccasions(): Promise<Occasion[]> {
  return api('/occasions');
}

export function createOccasion(input: {
  name: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  recurring?: boolean;
  recurringRule?: string;
  isHijriBased?: boolean;
}): Promise<{ id: string }> {
  return api('/occasions', { method: 'POST', body: JSON.stringify(input) });
}
