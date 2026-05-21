import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { API_BASE } from '@/lib/api/client';

function parseSetCookieHeader(header: string): {
  name: string;
  value: string;
  options: Partial<ResponseCookie>;
} | null {
  const parts = header.split(';').map((p) => p.trim());
  const nameValue = parts[0];
  const eq = nameValue.indexOf('=');
  if (eq <= 0) return null;

  const name = nameValue.slice(0, eq);
  const value = nameValue.slice(eq + 1);
  const options: Partial<ResponseCookie> = { path: '/' };

  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const sep = attr.indexOf('=');
    const key = (sep === -1 ? attr : attr.slice(0, sep)).toLowerCase();
    const val = sep === -1 ? '' : attr.slice(sep + 1);

    if (key === 'httponly') options.httpOnly = true;
    else if (key === 'secure') options.secure = true;
    else if (key === 'path' && val) options.path = val;
    else if (key === 'domain' && val) options.domain = val;
    else if (key === 'max-age' && val) options.maxAge = Number.parseInt(val, 10);
    else if (key === 'samesite' && val) {
      options.sameSite = val.toLowerCase() as 'lax' | 'strict' | 'none';
    }
  }

  return { name, value, options };
}

/** Apply Set-Cookie headers from the backend onto the Next.js response cookie store. */
export function applySetCookieHeaders(
  store: Awaited<ReturnType<typeof cookies>>,
  setCookieHeaders: string[],
): void {
  for (const header of setCookieHeaders) {
    const parsed = parseSetCookieHeader(header);
    if (parsed) {
      store.set(parsed.name, parsed.value, parsed.options);
    }
  }
}

function getSetCookieHeaders(res: Response): string[] {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * Rotate access + refresh cookies using the httpOnly refresh_token cookie.
 * Returns true when new cookies were issued.
 */
export async function tryRefreshSession(): Promise<boolean> {
  const store = await cookies();
  const refresh = store.get('refresh_token')?.value;
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refresh_token=${refresh}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;

    const setCookies = getSetCookieHeaders(res);
    if (setCookies.length > 0) {
      applySetCookieHeaders(store, setCookies);
    }
    return Boolean((await cookies()).get('access_token')?.value);
  } catch {
    return false;
  }
}
