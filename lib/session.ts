import { cookies } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { API_BASE } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/auth';

/**
 * Server-side helper to fetch the current user via the backend `/auth/me`
 * endpoint, forwarding the access_token cookie. Returns null when not
 * authenticated.
 */
export async function getCurrentUser(): Promise<MeUser | null> {
  const c = await cookies();
  const access = c.get('access_token')?.value;
  if (!access) return null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { cookie: `access_token=${access}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: MeUser };
    return data.user;
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
