export type DocumentOwnerType =
  | 'beneficiary'
  | 'spouse'
  | 'child'
  | 'job'
  | 'housing'
  | 'disease'
  | 'serious_illness'
  | 'social_coverage';

export type DocumentCategory =
  | 'cin'
  | 'medical'
  | 'school'
  | 'housing_proof'
  | 'salary_proof'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'divorce_certificate'
  | 'death_certificate'
  | 'unemployment_proof'
  | 'bank_statement'
  | 'utility_bill'
  | 'signed_consent'
  | 'other';

export interface BeneficiaryDocument {
  id: string;
  category: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  ownerLabel: string;
  fileId: string;
  issuedOn: string | null;
  expiresOn: string | null;
  createdAt: string;
  file: { mime: string; size: number };
}

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
  ownerType: DocumentOwnerType;
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

export function updateDocument(documentId: string, fileId: string) {
  return fetch(`/api/files/documents/${documentId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileId }),
  }).then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? 'Failed to update document');
    return body;
  });
}

export function deleteDocument(documentId: string) {
  return fetch(`/api/files/documents/${documentId}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? 'Failed to delete document');
    }
    return { ok: true };
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

export function listBeneficiaryDocuments(beneficiaryId: string): Promise<BeneficiaryDocument[]> {
  return fetch(`/api/files/documents/by-beneficiary/${beneficiaryId}`, {
    credentials: 'include',
  }).then(async (res) => {
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? 'Failed to list documents');
    return body as BeneficiaryDocument[];
  });
}

export function fileDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}/download`;
}
