import { cookies } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { API_BASE } from '@/lib/api/client';
import { tryRefreshSession } from '@/lib/auth-cookies';
import type { MeUser } from '@/lib/api/auth';

async function fetchMe(accessToken: string): Promise<MeUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { cookie: `access_token=${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: MeUser };
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to fetch the current user via the backend `/auth/me`
 * endpoint. If the access token expired but a refresh token remains (up to 30
 * days), silently refreshes and returns the user.
 */
export async function getCurrentUser(): Promise<MeUser | null> {
  const store = await cookies();
  const access = store.get('access_token')?.value;

  if (access) {
    const user = await fetchMe(access);
    if (user) return user;
  }

  const refreshed = await tryRefreshSession();
  if (!refreshed) return null;

  const accessAfter = (await cookies()).get('access_token')?.value;
  if (!accessAfter) return null;
  return fetchMe(accessAfter);
}

export async function requireUser(opts?: {
  kind?: 'staff' | 'donor';
  locale?: string;
  requirePlatformAdmin?: boolean;
}): Promise<MeUser> {
  const locale = (opts?.locale ?? 'ar') as 'ar' | 'fr' | 'en';
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/login', locale });
    throw new Error('redirected');
  }
  if (opts?.kind && user.kind !== opts.kind) {
    redirect({ href: user.kind === 'donor' ? '/me/donations' : '/dashboard', locale });
    throw new Error('redirected');
  }
  if (opts?.requirePlatformAdmin && !user.isPlatformAdmin) {
    redirect({ href: '/dashboard', locale });
    throw new Error('redirected');
  }
  return user;
}
