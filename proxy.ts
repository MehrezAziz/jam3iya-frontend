import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

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
    if (setCookies.length > 0) {
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      for (const raw of setCookies) {
        const eq = raw.indexOf('=');
        if (eq <= 0) continue;
        const name = raw.slice(0, eq);
        const rest = raw.slice(eq + 1).split(';').map((p) => p.trim());
        const value = rest[0] ?? '';
        const opts: {
          path?: string;
          domain?: string;
          maxAge?: number;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: 'lax' | 'strict' | 'none';
        } = { path: '/' };
        for (let i = 1; i < rest.length; i++) {
          const part = rest[i];
          const sep = part.indexOf('=');
          const k = (sep === -1 ? part : part.slice(0, sep)).toLowerCase();
          const v = sep === -1 ? '' : part.slice(sep + 1);
          if (k === 'httponly') opts.httpOnly = true;
          else if (k === 'secure') opts.secure = true;
          else if (k === 'path' && v) opts.path = v;
          // Host-only cookie (no Domain) — works for jam3iya.org and www.
          else if (k === 'domain') continue;
          else if (k === 'max-age' && v) opts.maxAge = Number.parseInt(v, 10);
          else if (k === 'samesite' && v) opts.sameSite = v.toLowerCase() as 'lax' | 'strict' | 'none';
        }
        response.cookies.set(name, value, opts);
      }
    }
  } catch {
    // network error — layout will redirect unauthenticated users
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
