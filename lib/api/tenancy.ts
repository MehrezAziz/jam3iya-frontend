import { api } from './client';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  isMain: boolean;
  region: string | null;
  city: string | null;
  loginCode?: string | null;
  loginEmail?: string | null;
}

export interface MainDepartment {
  id: string;
  name: string;
  region: string | null;
  city: string | null;
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

export function getMainDepartment(): Promise<MainDepartment> {
  return api('/departments/main');
}

export function updateMainDepartmentLocation(input: {
  region?: string | null;
  city?: string | null;
}) {
  return api('/departments/main/location', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function getBeneficiaryAccessStatus(): Promise<{
  pinConfigured: boolean;
  accessGranted: boolean;
}> {
  return api('/organizations/me/beneficiary-access');
}

export function setBeneficiaryAccessPin(pin: string | null): Promise<{ configured: boolean }> {
  return api('/organizations/me/beneficiary-access-pin', {
    method: 'PUT',
    body: JSON.stringify({ pin }),
  });
}

export function changeBeneficiaryAccessPin(input: {
  newPin: string;
  oldPin?: string;
  password?: string;
}) {
  return api('/organizations/me/beneficiary-access-pin/change', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function createDepartment(input: {
  name: string;
  description?: string;
  isMain?: boolean;
  loginEmail?: string;
  password?: string;
}) {
  return api('/departments', { method: 'POST', body: JSON.stringify(input) });
}

export function verifyBeneficiaryAccessPin(pin: string): Promise<{ expiresAt: string }> {
  return api('/organizations/me/beneficiary-access-pin/verify', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
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
