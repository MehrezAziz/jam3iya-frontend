import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isLandingPath, isProtectedPath } from '@/lib/auth-routes';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ParsedCookie {
  name: string;
  value: string;
  options: {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  };
}

function parseSetCookie(raw: string): ParsedCookie | null {
  const eq = raw.indexOf('=');
  if (eq <= 0) return null;
  const name = raw.slice(0, eq);
  const rest = raw
    .slice(eq + 1)
    .split(';')
    .map((p) => p.trim());
  const value = rest[0] ?? '';
  const options: ParsedCookie['options'] = { path: '/' };
  for (let i = 1; i < rest.length; i++) {
    const part = rest[i];
    const sep = part.indexOf('=');
    const key = (sep === -1 ? part : part.slice(0, sep)).toLowerCase();
    const val = sep === -1 ? '' : part.slice(sep + 1);
    if (key === 'httponly') options.httpOnly = true;
    else if (key === 'secure') options.secure = true;
    else if (key === 'path' && val) options.path = val;
    else if (key === 'domain') continue;
    else if (key === 'max-age' && val) options.maxAge = Number.parseInt(val, 10);
    else if (key === 'samesite' && val)
      options.sameSite = val.toLowerCase() as 'lax' | 'strict' | 'none';
  }
  return { name, value, options };
}

function serializeCookie(c: ParsedCookie): string {
  const parts = [`${c.name}=${c.value}`];
  if (c.options.path) parts.push(`Path=${c.options.path}`);
  if (typeof c.options.maxAge === 'number') parts.push(`Max-Age=${c.options.maxAge}`);
  if (c.options.httpOnly) parts.push('HttpOnly');
  if (c.options.secure) parts.push('Secure');
  if (c.options.sameSite) {
    const map = { lax: 'Lax', strict: 'Strict', none: 'None' } as const;
    parts.push(`SameSite=${map[c.options.sameSite]}`);
  }
  return parts.join('; ');
}

function hasSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('access_token')?.value || request.cookies.get('refresh_token')?.value,
  );
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let access = request.cookies.get('access_token')?.value;
  const refresh = request.cookies.get('refresh_token')?.value;

  let parsed: ParsedCookie[] = [];
  if (!access && refresh) {
    try {
      const r = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { cookie: `refresh_token=${refresh}` },
        cache: 'no-store',
      });
      if (r.ok && typeof r.headers.getSetCookie === 'function') {
        for (const raw of r.headers.getSetCookie()) {
          const c = parseSetCookie(raw);
          if (c) parsed.push(c);
        }
      }
    } catch {
      // unauthenticated — protected routes fall through to welcome redirect
    }
  }

  for (const c of parsed) {
    request.cookies.set(c.name, c.value);
    if (c.name === 'access_token') access = c.value;
  }

  const signedIn = Boolean(access || refresh);

  // Guest opened a protected page → welcome page, not login.
  if (!signedIn && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Signed-in user opened the marketing home → dashboard (staff default).
  if (signedIn && isLandingPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const response = intlMiddleware(request);

  for (const c of parsed) {
    response.headers.append('Set-Cookie', serializeCookie(c));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
