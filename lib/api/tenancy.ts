import { api } from './client';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  isMain: boolean;
}

export interface OrganizationProfile {
  id: string;
  legalName: string;
  slug: string;
  fiscalId: string | null;
  country: string;
  defaultCurrency: string;
  defaultLanguage: string;
  timezone: string;
  status: string;
  publicPageEnabled: boolean;
  defaultBillSeries: string;
}

export function myOrganization(): Promise<OrganizationProfile> {
  return api('/organizations/me');
}

export function listDepartments(): Promise<Department[]> {
  return api('/departments');
}

export function publicOrg(slug: string): Promise<{
  id: string;
  legalName: string;
  slug: string;
  defaultCurrency: string;
  defaultLanguage: string;
  publicPageEnabled: boolean;
}> {
  return api(`/public/orgs/${encodeURIComponent(slug)}`);
}

export interface PublicCampaign {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  targetAmountMinor: number | null;
  collectedAmountMinor: number;
  distributedAmountMinor: number;
  currency: string;
  state: 'draft' | 'active' | 'closed';
}

export interface PublicStats {
  organization: {
    id: string;
    legalName: string;
    slug: string;
    defaultCurrency: string;
    defaultLanguage: string;
  };
  year: number;
  totals: {
    donationsCount: number;
    donationsAmountMinor: number;
    distributionsCount: number;
    activeBeneficiaries: number;
  };
  campaigns: PublicCampaign[];
}

export function publicOrgStats(slug: string): Promise<PublicStats> {
  return api(`/public/orgs/${encodeURIComponent(slug)}/stats`);
}
