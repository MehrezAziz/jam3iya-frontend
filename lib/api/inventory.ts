import { api } from './client';

/** Category is free text — these are common suggestions only. */
export const SUGGESTED_INVENTORY_CATEGORIES = [
  'food',
  'medicine',
  'clothing',
  'school_supplies',
  'hygiene',
  'blankets',
  'furniture',
  'other',
] as const;
export type InventoryCategory = string;

export interface InventoryItemListEntry {
  id: string;
  name: string;
  category: string;
  unit: string;
  defaultQuantity: number | null;
  trackExpiry: boolean;
  minStock: number | null;
  notes: string | null;
  createdAt: string;
  currentStock: number;
  belowMin: boolean;
}

export interface InventoryItemListResult {
  total: number;
  items: InventoryItemListEntry[];
  limit: number;
  offset: number;
}

export interface StockLot {
  id: string;
  receivedAt: string;
  expiresOn: string | null;
  quantityInitial: number;
  quantityRemaining: number;
  supplierName: string | null;
  unitCostMinor: number | null;
  currency: string;
  storageLocation: string | null;
}

export interface InventoryItemDetail extends Omit<InventoryItemListEntry, 'belowMin'> {
  lots: StockLot[];
}

export function listInventoryItems(params: {
  q?: string;
  category?: InventoryCategory;
  limit?: number;
  offset?: number;
} = {}): Promise<InventoryItemListResult> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  return api(`/inventory/items${qs ? `?${qs}` : ''}`);
}

export function getInventoryItem(id: string): Promise<InventoryItemDetail> {
  return api(`/inventory/items/${id}`);
}

export function createInventoryItem(input: {
  name: string;
  category: string;
  unit: string;
  defaultQuantity?: number;
  trackExpiry?: boolean;
  minStock?: number;
  notes?: string;
}): Promise<{ id: string; name: string }> {
  return api('/inventory/items', { method: 'POST', body: JSON.stringify(input) });
}

export function updateInventoryItem(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    unit: string;
    defaultQuantity: number | null;
    trackExpiry: boolean;
    minStock: number | null;
    notes: string | null;
  }>,
): Promise<{ id: string }> {
  return api(`/inventory/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function createStockLot(input: {
  itemId: string;
  quantity: number;
  expiresOn?: string;
  supplierName?: string;
  supplierInvoiceRef?: string;
  unitCostMinor?: number;
  currency?: string;
  storageLocation?: string;
  notes?: string;
}): Promise<{ id: string }> {
  return api('/inventory/lots', { method: 'POST', body: JSON.stringify(input) });
}

export function adjustStockLot(
  id: string,
  input: { delta: number; reason: string; type?: 'adjustment' | 'expired_writeoff' | 'damaged_writeoff' },
): Promise<{ id: string; quantityRemaining: number }> {
  return api(`/inventory/lots/${id}/adjust`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateStockLot(
  id: string,
  input: Partial<{
    expiresOn: string | null;
    supplierName: string | null;
    supplierInvoiceRef: string | null;
    unitCostMinor: number | null;
    storageLocation: string | null;
    notes: string | null;
  }>,
): Promise<{ id: string }> {
  return api(`/inventory/lots/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}
