import type { MeUser } from '@/lib/api/auth';

/** Where to send a user right after login or when opening the site while signed in. */
export function getPostLoginPath(user: MeUser): string {
  if (user.isPlatformAdmin) return '/platform/organizations';
  if (user.kind === 'donor') return '/me/donations';
  return '/dashboard';
}

/** Marketing / welcome page (locale home). */
export function isLandingPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/' || p === '/ar' || p === '/fr' || p === '/en';
}

/** App pages that require a session (guests are sent back to the welcome page). */
export function isProtectedPath(pathname: string): boolean {
  const protectedPrefixes = [
    '/dashboard',
    '/beneficiaries',
    '/donations',
    '/distributions',
    '/transfers',
    '/inventory',
    '/campaigns',
    '/bills',
    '/audit',
    '/settings',
    '/platform',
    '/me/',
  ];
  return protectedPrefixes.some((seg) => pathname.includes(seg));
}
