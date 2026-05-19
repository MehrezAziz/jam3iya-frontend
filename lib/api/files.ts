const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function uploadFile(file: File): Promise<{ id: string; mime: string; size: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(body?.message ?? `Upload failed (${res.status})`);
  return body;
}

export function attachDocument(input: {
  ownerType: 'beneficiary' | 'spouse' | 'child' | 'social_coverage';
  ownerId: string;
  category: string;
  fileId: string;
  issuedOn?: string;
  expiresOn?: string;
}) {
  return fetch('/api/files/documents', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? 'Failed to attach document');
    return body;
  });
}

export function listDocuments(ownerType: string, ownerId: string) {
  const qs = new URLSearchParams({ ownerType, ownerId }).toString();
  return fetch(`/api/files/documents?${qs}`, { credentials: 'include' }).then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? 'Failed to list documents');
    return body as Array<{
      id: string;
      category: string;
      fileId: string;
      createdAt: string;
      file: { mime: string; size: number };
    }>;
  });
}
