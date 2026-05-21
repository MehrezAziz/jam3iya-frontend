/**
 * Minimal API client used by both server components and client components.
 *
 * - On the server, calls go directly to the backend at API_BASE.
 * - On the client, calls go through Next's rewrite at /api (set in next.config.ts)
 *   so cookies stay first-party.
 *
 * Auth uses cookies, so we always include credentials.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiError extends Error {
  status: number;
  body?: unknown;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export async function api<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const url = isBrowser() ? `/api${path}` : `${API_BASE}/api${path}`;
  const doFetch = () =>
    fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

  let res = await doFetch();

  // Access token is short-lived; renew from httpOnly refresh cookie when possible.
  if (
    isBrowser() &&
    res.status === 401 &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/login')
  ) {
    try {
      const { refresh } = await import('./auth');
      await refresh();
      res = await doFetch();
    } catch {
      // keep original 401
    }
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = new Error(
      (body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request failed with ${res.status}`),
    ) as ApiError;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
