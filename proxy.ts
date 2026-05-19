import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const PROTECTED = [
  '/dashboard',
  '/beneficiaries',
  '/donations',
  '/distributions',
  '/inventory',
  '/campaigns',
  '/bills',
  '/audit',
  '/settings',
  '/platform',
  '/me',
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname.includes(p));
}

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;

  if (!isProtected(pathname)) return response;

  const access = request.cookies.get('access_token')?.value;
  if (access) return response;

  const refresh = request.cookies.get('refresh_token')?.value;
  if (!refresh) return response;

  try {
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refresh_token=${refresh}` },
      cache: 'no-store',
    });
    if (!refreshRes.ok) return response;

    const setCookies =
      typeof refreshRes.headers.getSetCookie === 'function'
        ? refreshRes.headers.getSetCookie()
        : [];
    for (const cookie of setCookies) {
      response.headers.append('Set-Cookie', cookie);
    }
  } catch {
    // network error — layout will redirect unauthenticated users
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
