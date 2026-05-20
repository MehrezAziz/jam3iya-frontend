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

export interface PlatformOrgAdmin {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface PlatformOrgDetail extends PlatformOrgSummary {
  email: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  mainDepartment: { name: string; region: string | null; city: string | null } | null;
  admins: PlatformOrgAdmin[];
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
  mainDepartmentRegion?: string;
  mainDepartmentCity?: string;
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

export interface ResetOrgAdminPasswordResult {
  userId: string;
  email: string;
  oneTimePassword: string | null;
  mustChangePassword: boolean;
}

export async function listPlatformOrganizations(): Promise<PlatformOrgSummary[]> {
  return api('/platform/organizations');
}

export async function getPlatformOrganization(id: string): Promise<PlatformOrgDetail> {
  return api(`/platform/organizations/${id}`);
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

export async function resetOrgAdminPassword(
  orgId: string,
  userId: string,
  body?: { newPassword?: string },
): Promise<ResetOrgAdminPasswordResult> {
  return api(`/platform/organizations/${orgId}/admins/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}
