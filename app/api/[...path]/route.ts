import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteCtx = { params: Promise<{ path: string[] }> };

/**
 * Proxy /api/* to the Nest backend and forward Set-Cookie headers.
 * next.config rewrites often drop auth cookies in production Docker builds.
 */
async function proxyToBackend(req: NextRequest, { params }: RouteCtx): Promise<NextResponse> {
  const { path } = await params;
  const target = new URL(`/api/${path.join('/')}`, API_BASE);
  target.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') return;
    headers.set(key, value);
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const backendRes = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    cache: 'no-store',
    // Required when streaming a request body to Node fetch
    ...(hasBody ? { duplex: 'half' as const } : {}),
  });

  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'transfer-encoding' || lower === 'connection') return;
    resHeaders.append(key, value);
  });

  const setCookies =
    typeof backendRes.headers.getSetCookie === 'function'
      ? backendRes.headers.getSetCookie()
      : [];
  if (setCookies.length > 0) {
    resHeaders.delete('set-cookie');
    for (const cookie of setCookies) {
      resHeaders.append('Set-Cookie', cookie);
    }
  }

  return new NextResponse(backendRes.body, {
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
