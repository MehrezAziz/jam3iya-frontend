import { api } from './client';

export interface Governorate {
  id: number;
  name: string;
}

export interface Delegation {
  id: number;
  name: string;
  governorateId: number;
}

export function listGovernorates(): Promise<Governorate[]> {
  return api('/geo/governorates');
}

export function listDelegations(governorateId: number): Promise<Delegation[]> {
  return api(`/geo/governorates/${governorateId}/delegations`);
}
