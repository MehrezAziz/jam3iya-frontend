import { api } from './client';

export interface PlatformOrgSummary {
  id: string;
  legalName: string;
  slug: string;
  country: string;
  defaultCurrency: string;
  defaultLanguage: string;
  timezone: string;
  status: 'active' | 'suspended' | 'closed';
  publicPageEnabled: boolean;
  fiscalId: string | null;
  createdAt: string;
  userCount: number;
  departmentCount: number;
}

export interface CreateOrganizationInput {
  legalName: string;
  slug: string;
  country?: string;
  defaultCurrency?: string;
  defaultLanguage?: 'ar' | 'fr' | 'en';
  timezone?: string;
  fiscalId?: string;
  publicPageEnabled?: boolean;
  mainDepartmentName?: string;
  admin: {
    email: string;
    fullName: string;
    phone?: string;
    locale?: 'ar' | 'fr' | 'en';
    initialPassword?: string;
  };
}

export interface CreateOrganizationResult {
  organization: PlatformOrgSummary;
  admin: {
    id: string;
    email: string;
    fullName: string;
    oneTimePassword: string | null;
    mustChangePassword: boolean;
  };
  loginUrl: string;
}

export async function listPlatformOrganizations(): Promise<PlatformOrgSummary[]> {
  return api('/platform/organizations');
}

export async function createPlatformOrganization(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  return api('/platform/organizations', { method: 'POST', body: JSON.stringify(input) });
}

export async function suspendPlatformOrganization(
  id: string,
  body: { suspended: boolean; reason?: string },
): Promise<PlatformOrgSummary> {
  return api(`/platform/organizations/${id}/suspend`, { method: 'PATCH', body: JSON.stringify(body) });
}
