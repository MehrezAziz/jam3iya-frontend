'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  PackagePlus,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { Link } from '@/i18n/navigation';
import {
  getInventoryItem,
  createStockLot,
  updateStockLot,
  adjustStockLot,
  updateInventoryItem,
  setInventoryItemStock,
  SUGGESTED_INVENTORY_CATEGORIES,
} from '@/lib/api/inventory';
import { tndToMinor, minorToTnd, DEFAULT_CURRENCY } from '@/lib/money';

const receiveSchema = z.object({
  /** All numbers are kept as strings in the form, parsed at submit time. */
  quantity: z.string().refine((s) => Number(s) > 0, 'Quantity must be > 0'),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  supplierName: z.string().max(200).optional(),
  supplierInvoiceRef: z.string().max(80).optional(),
  unitCostTnd: z.string().optional(),
  storageLocation: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

type ReceiveForm = z.infer<typeof receiveSchema>;

export default function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const qc = useQueryClient();
  const [showReceive, setShowReceive] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editDefaultQty, setEditDefaultQty] = useState('');
  const [editTrackExpiry, setEditTrackExpiry] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [setStockQty, setSetStockQty] = useState('');
  const [setStockReason, setSetStockReason] = useState('');

  const itemQ = useQuery({ queryKey: ['inventory', id], queryFn: () => getInventoryItem(id) });
  const item = itemQ.data;

  const form = useForm<ReceiveForm>({
    resolver: zodResolver(receiveSchema),
    defaultValues: { quantity: '' },
  });

  useEffect(() => {
    if (item != null) {
      setSetStockQty(String(item.currentStock));
    }
  }, [item?.currentStock, item?.id]);

  const setStockMut = useMutation({
    mutationFn: () => {
      const qty = Number(setStockQty);
      if (!Number.isFinite(qty) || qty < 0) {
        throw new Error(t('inventory.setStockInvalid'));
      }
      return setInventoryItemStock(id, {
        quantity: qty,
        reason: setStockReason.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(t('inventory.stockUpdated', { n: res.currentStock }));
      setSetStockQty(String(res.currentStock));
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const updateItemMut = useMutation({
    mutationFn: () =>
      updateInventoryItem(id, {
        name: editName.trim(),
        category: editCategory.trim(),
        unit: editUnit.trim(),
        minStock: editMinStock ? Number(editMinStock) : null,
        defaultQuantity: editDefaultQty ? Number(editDefaultQty) : null,
        trackExpiry: editTrackExpiry,
        notes: editNotes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t('common.successUpdated'));
      setEditingItem(false);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  function startEditItem() {
    if (!item) return;
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinStock(item.minStock != null ? String(item.minStock) : '');
    setEditDefaultQty(item.defaultQuantity != null ? String(item.defaultQuantity) : '');
    setEditTrackExpiry(item.trackExpiry);
    setEditNotes(item.notes ?? '');
    setEditingItem(true);
  }

  const receiveMutation = useMutation({
    mutationFn: (values: ReceiveForm) => {
      const qty = Number(values.quantity);
      const cost = values.unitCostTnd ? Number(values.unitCostTnd) : 0;
      return createStockLot({
        itemId: id,
        quantity: qty,
        expiresOn: values.expiresOn || undefined,
        supplierName: values.supplierName || undefined,
        supplierInvoiceRef: values.supplierInvoiceRef || undefined,
        unitCostMinor: cost > 0 ? tndToMinor(cost) : undefined,
        currency: DEFAULT_CURRENCY,
        storageLocation: values.storageLocation || undefined,
        notes: values.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('inventory.lotCreated'));
      setShowReceive(false);
      form.reset({ quantity: item?.defaultQuantity ? String(item.defaultQuantity) : '' });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ms-2 h-7 px-2 text-muted-foreground">
            <Link href="/inventory">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('common.back')}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{item?.name ?? '...'}</h1>
            {item ? <Badge variant="muted">{item.category.replace(/_/g, ' ')}</Badge> : null}
          </div>
          {item ? (
            <p className="text-sm text-muted-foreground">
              {item.unit}
              {item.defaultQuantity ? ` · ${t('inventory.packOf', { n: item.defaultQuantity })}` : ''}
              {' · '}
              {t('inventory.currentStock')}: <strong>{item.currentStock}</strong>
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={startEditItem}>
            <Pencil className="h-4 w-4" />
            {t('inventory.editItem')}
          </Button>
          <Button onClick={() => setShowReceive((v) => !v)}>
            <PackagePlus className="h-4 w-4" />
            {t('inventory.receiveStock')}
          </Button>
        </div>
      </header>

      {item ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('inventory.setStockTitle')}</CardTitle>
            <CardDescription>{t('inventory.setStockHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="setStockQty">{t('inventory.currentStock')}</Label>
              <Input
                id="setStockQty"
                type="number"
                step="any"
                min="0"
                className="w-32"
                value={setStockQty}
                onChange={(e) => setSetStockQty(e.target.value)}
              />
            </div>
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label htmlFor="setStockReason">{t('inventory.adjustReason')}</Label>
              <Input
                id="setStockReason"
                placeholder={t('inventory.setStockReasonPlaceholder')}
                value={setStockReason}
                onChange={(e) => setSetStockReason(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => setStockMut.mutate()}
              disabled={setStockMut.isPending}
            >
              <Save className="h-4 w-4" />
              {t('common.save')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {editingItem && item ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.editItem')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('inventory.itemName')}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('inventory.category')}</Label>
              <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                {[...SUGGESTED_INVENTORY_CATEGORIES, editCategory]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('inventory.unit')}</Label>
              <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('inventory.defaultQuantity')}</Label>
              <Input value={editDefaultQty} onChange={(e) => setEditDefaultQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('inventory.minStock')}</Label>
              <Input value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editTrackExpiry}
                onChange={(e) => setEditTrackExpiry(e.target.checked)}
              />
              {t('inventory.trackExpiry')}
            </label>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('inventory.notes')}</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" onClick={() => updateItemMut.mutate()} disabled={updateItemMut.isPending}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditingItem(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showReceive && (
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.receiveTitle')}</CardTitle>
            <CardDescription>{t('inventory.receiveHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((v) => receiveMutation.mutate(v))}
            >
              <div className="space-y-1.5">
                <Label htmlFor="quantity">{t('inventory.quantity')}</Label>
                <Input id="quantity" type="number" step="any" {...form.register('quantity')} />
                {item?.defaultQuantity ? (
                  <p className="text-xs text-muted-foreground">
                    {t('inventory.defaultQuantityFallback', { n: item.defaultQuantity })}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresOn">{t('inventory.expiresOn')}</Label>
                <DateInput id="expiresOn" {...form.register('expiresOn')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierName">{t('inventory.supplier')}</Label>
                <Input id="supplierName" {...form.register('supplierName')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierInvoiceRef">{t('inventory.invoiceRef')}</Label>
                <Input id="supplierInvoiceRef" {...form.register('supplierInvoiceRef')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitCostTnd">
                  {t('inventory.unitCost')} <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
                </Label>
                <MoneyInput id="unitCostTnd" placeholder="0.000" {...form.register('unitCostTnd')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="storageLocation">{t('inventory.storageLocation')}</Label>
                <Input id="storageLocation" {...form.register('storageLocation')} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="notes">{t('inventory.notes')}</Label>
                <Input id="notes" {...form.register('notes')} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowReceive(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={receiveMutation.isPending}>
                  {receiveMutation.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('inventory.lotsTitle')}
          </CardTitle>
          <CardDescription>{t('inventory.lotsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {itemQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : item && item.lots.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.received')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.expiresOn')}</th>
                    <th className="px-2 py-2 text-end font-medium">{t('inventory.remaining')}</th>
                    <th className="px-2 py-2 text-end font-medium">{t('inventory.initial')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.supplier')}</th>
                    <th className="px-2 py-2 text-start font-medium">{t('inventory.location')}</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {item.lots.map((lot) =>
                    editingLotId === lot.id ? (
                      <LotEditRow
                        key={lot.id}
                        itemId={id}
                        lot={lot}
                        onClose={() => setEditingLotId(null)}
                      />
                    ) : (
                      <tr key={lot.id} className="border-b last:border-0">
                        <td className="px-2 py-2 text-muted-foreground">
                          <Calendar className="me-1 inline h-3 w-3" />
                          {formatDate(lot.receivedAt)}
                        </td>
                        <td className="px-2 py-2">
                          {lot.expiresOn ? <ExpiryBadge iso={lot.expiresOn} /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 text-end tabular-nums font-semibold">{lot.quantityRemaining}</td>
                        <td className="px-2 py-2 text-end tabular-nums text-muted-foreground">{lot.quantityInitial}</td>
                        <td className="px-2 py-2">{lot.supplierName ?? '—'}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {lot.storageLocation ? (
                            <>
                              <MapPin className="me-1 inline h-3 w-3" />
                              {lot.storageLocation}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2 py-2 text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLotId(lot.id)}
                            aria-label={t('inventory.editLot')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('inventory.noLots')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface LotEditRowProps {
  itemId: string;
  lot: {
    id: string;
    expiresOn: string | null;
    quantityRemaining: number;
    quantityInitial: number;
    supplierName: string | null;
    storageLocation: string | null;
    unitCostMinor: number | null;
  };
  onClose: () => void;
}

function LotEditRow({ itemId, lot, onClose }: LotEditRowProps) {
  const t = useTranslations();
  const qc = useQueryClient();

  const [expiresOn, setExpiresOn] = useState(lot.expiresOn ? lot.expiresOn.slice(0, 10) : '');
  const [supplierName, setSupplierName] = useState(lot.supplierName ?? '');
  const [storageLocation, setStorageLocation] = useState(lot.storageLocation ?? '');
  const [unitCostTnd, setUnitCostTnd] = useState<number>(
    lot.unitCostMinor != null ? minorToTnd(lot.unitCostMinor) : 0,
  );
  const [newRemaining, setNewRemaining] = useState<number>(lot.quantityRemaining);
  const [reason, setReason] = useState('');

  const saveMut = useMutation({
    mutationFn: async () => {
      await updateStockLot(lot.id, {
        expiresOn: expiresOn || null,
        supplierName: supplierName || null,
        storageLocation: storageLocation || null,
        unitCostMinor: unitCostTnd > 0 ? tndToMinor(unitCostTnd) : null,
      });
      if (newRemaining !== lot.quantityRemaining) {
        const delta = newRemaining - lot.quantityRemaining;
        await adjustStockLot(lot.id, {
          delta,
          reason: reason.trim() || (delta > 0 ? 'Manual stock correction (+)' : 'Manual stock correction (-)'),
        });
      }
    },
    onSuccess: () => {
      toast.success(t('inventory.lotUpdated'));
      qc.invalidateQueries({ queryKey: ['inventory', itemId] });
      onClose();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const stockChanged = newRemaining !== lot.quantityRemaining;

  return (
    <tr className="border-b bg-muted/20">
      <td colSpan={7} className="p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t('inventory.expiresOn')}</Label>
            <DateInput value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('inventory.supplier')}</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('inventory.storageLocation')}</Label>
            <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>
              {t('inventory.unitCost')} <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
            </Label>
            <MoneyInput value={unitCostTnd || ''} onValueChange={(v) => setUnitCostTnd(v)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('inventory.remaining')}</Label>
            <Input
              type="number"
              step="any"
              value={newRemaining}
              onChange={(e) => setNewRemaining(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">{t('inventory.adjustHint', { n: lot.quantityRemaining })}</p>
          </div>
          {stockChanged && (
            <div className="space-y-1.5">
              <Label>{t('inventory.adjustReason')}</Label>
              <Input
                placeholder={t('inventory.adjustReasonPlaceholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3 w-3" />
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-3 w-3" />
            {saveMut.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ExpiryBadge({ iso }: { iso: string }) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return <Badge variant="destructive">{formatDate(iso)}</Badge>;
  if (days < 14) return <Badge variant="warning">{formatDate(iso)}</Badge>;
  return <Badge variant="muted">{formatDate(iso)}</Badge>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
