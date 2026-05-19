import { api } from './client';

export interface DistributionLine {
  id: string;
  lineKind: 'cash' | 'item';
  itemId: string | null;
  quantity: number | null;
  unit: string | null;
  amountMinor: number | null;
  currency: string | null;
  item?: { name: string; unit: string } | null;
}

export interface DistributionSummary {
  id: string;
  beneficiaryId: string;
  kind: string;
  status: string;
  plannedAt: string | null;
  deliveredAt: string | null;
  campaignId: string | null;
  createdAt: string;
  beneficiary: { code: string; publicAlias: string | null };
  lines: DistributionLine[];
}

export function listDistributions(params?: { status?: string }) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  const qs = sp.toString();
  return api<{ total: number; items: DistributionSummary[] }>(`/distributions${qs ? `?${qs}` : ''}`);
}

export function deliverDistribution(id: string) {
  return api(`/distributions/${id}/deliver`, { method: 'PATCH', body: JSON.stringify({}) });
}

export function cancelDistribution(id: string, reason: string) {
  return api(`/distributions/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export type DistributionKind = 'cash' | 'goods' | 'mixed';

export type CreateDistributionInput = {
  beneficiaryId: string;
  kind: DistributionKind;
  plannedAt?: string;
  campaignId?: string;
  occasionId?: string;
  deliverNow?: boolean;
  lines: Array<
    | { lineKind: 'cash'; amountMinor: number; currency?: string; notes?: string }
    | { lineKind: 'item'; itemId: string; quantity: number; notes?: string }
  >;
};

export function createDistribution(input: CreateDistributionInput) {
  return api<{ id: string }>('/distributions', { method: 'POST', body: JSON.stringify(input) });
}

export function updateDistribution(
  id: string,
  input: {
    plannedAt?: string | null;
    deliveredAt?: string | null;
    status?: 'planned' | 'ready' | 'delivered' | 'cancelled';
    lines?: Array<{ id: string; amountMinor?: number; quantity?: number }>;
  },
) {
  return api(`/distributions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}
