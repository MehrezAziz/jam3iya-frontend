import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteCtx = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'content-encoding',
]);

/** Drop the Domain attribute so the browser saves the cookie host-only (works for jam3iya.org and www). */
function stripDomain(setCookie: string): string {
  return setCookie
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.toLowerCase().startsWith('domain='))
    .join('; ');
}

/**
 * Proxy /api/* to the Nest backend.
 *
 * Critical: each `Set-Cookie` from the backend is forwarded as a separate
 * header entry (using `getSetCookie()`), never via `Headers.forEach` — that
 * would join multiple cookies with commas and break Max-Age, killing
 * persistent login.
 */
async function proxyToBackend(req: NextRequest, { params }: RouteCtx): Promise<NextResponse> {
  const { path } = await params;
  const target = new URL(`/api/${path.join('/')}`, API_BASE);
  target.search = req.nextUrl.search;

  const fwdHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    fwdHeaders.set(key, value);
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const backendRes = await fetch(target, {
    method: req.method,
    headers: fwdHeaders,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') return;
    if (HOP_BY_HOP.has(lower)) return;
    resHeaders.append(key, value);
  });

  const setCookies =
    typeof backendRes.headers.getSetCookie === 'function'
      ? backendRes.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    resHeaders.append('Set-Cookie', stripDomain(cookie));
  }

  const responseBody = await backendRes.arrayBuffer();
  return new NextResponse(responseBody, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: resHeaders,
  });
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
export const OPTIONS = proxyToBackend;
