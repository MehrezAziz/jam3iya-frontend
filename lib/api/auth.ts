import { api } from './client';

export interface SessionUser {
  id: string;
  organizationId: string;
  kind: 'staff' | 'donor';
  email: string;
  fullName: string;
  twoFactorEnabled: boolean;
  locale: string;
}

export interface MeUser {
  userId: string;
  organizationId: string;
  kind: 'staff' | 'donor';
  email: string;
  fullName: string;
  sessionId: string;
  departmentId?: string | null;
  organization?: {
    id: string;
    legalName: string;
    slug: string;
    defaultLanguage: string;
    defaultCurrency: string;
  } | null;
  roles: string[];
  permissions: string[];
  isPlatformAdmin: boolean;
  maxPrivilegeLevel: number;
}

export async function login(input: {
  email: string;
  password: string;
  organizationSlug?: string;
  twoFactorCode?: string;
}): Promise<{ user: SessionUser } | { needsTwoFactor: true }> {
  return api('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export async function departmentLogin(input: {
  organizationSlug: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser }> {
  return api('/auth/login/department', { method: 'POST', body: JSON.stringify(input) });
}

export async function registerDonor(input: {
  organizationSlug: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  pseudo?: string;
  acceptsTaxReceipt?: boolean;
  fiscalId?: string;
  locale?: 'ar' | 'fr' | 'en';
}): Promise<{ user: SessionUser }> {
  return api('/auth/register-donor', { method: 'POST', body: JSON.stringify(input) });
}

export async function logout(): Promise<{ ok: true }> {
  return api('/auth/logout', { method: 'POST' });
}

export async function refresh(): Promise<{ user: SessionUser }> {
  return api('/auth/refresh', { method: 'POST' });
}

export async function me(): Promise<{ user: MeUser }> {
  return api('/auth/me');
}

export async function setupTwoFactor(): Promise<{ otpauthUrl: string; qrDataUrl: string; label: string }> {
  return api('/auth/2fa/setup', { method: 'POST' });
}

export async function confirmTwoFactor(code: string): Promise<{ recoveryCodes: string[] }> {
  return api('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) });
}
