import { cookies } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { API_BASE } from '@/lib/api/client';
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

/** Extract the new access_token from a refresh response's Set-Cookie headers. */
function extractAccessToken(res: Response): string | null {
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [];
  for (const raw of setCookies) {
    const match = raw.match(/^access_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Server-side helper to fetch the current user.
 *
 * 1. Tries the existing access_token (15 min lifetime).
 * 2. On expiry, exchanges the refresh_token (30 day lifetime) for a fresh
 *    access_token directly — without writing to the Next.js cookie store
 *    (which is read-only in server components on Next 15+). The middleware
 *    handles writing new cookies to the browser for the next request.
 */
export async function getCurrentUser(): Promise<MeUser | null> {
  const store = await cookies();
  const access = store.get('access_token')?.value;

  if (access) {
    const user = await fetchMe(access);
    if (user) return user;
  }

  const refresh = store.get('refresh_token')?.value;
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refresh_token=${refresh}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const newAccess = extractAccessToken(res);
    if (!newAccess) return null;

    return await fetchMe(newAccess);
  } catch {
    return null;
  }
}

export async function requireUser(opts?: {
  kind?: 'staff' | 'donor';
  locale?: string;
  requirePlatformAdmin?: boolean;
}): Promise<MeUser> {
  const locale = (opts?.locale ?? 'ar') as 'ar' | 'fr' | 'en';
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/', locale });
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
