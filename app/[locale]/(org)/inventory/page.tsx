'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertCircle, Package, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import {
  listInventoryItems,
  createInventoryItem,
  SUGGESTED_INVENTORY_CATEGORIES,
  type InventoryItemListEntry,
} from '@/lib/api/inventory';

const createSchema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  unit: z.string().min(1).max(40),
  /** Strings in the form; converted to numbers at submit time. */
  defaultQuantity: z.string().optional(),
  trackExpiry: z.boolean(),
  minStock: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function InventoryPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [showNew, setShowNew] = useState(false);

  const q = useQuery({
    queryKey: ['inventory', 'items', { search, category }],
    queryFn: () => listInventoryItems({ q: search || undefined, category: category || undefined }),
  });

  const knownCategories = Array.from(
    new Set([...SUGGESTED_INVENTORY_CATEGORIES, ...(q.data?.items.map((i) => i.category) ?? [])]),
  );

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', category: 'food', unit: 'kg', trackExpiry: false },
  });

  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      toast.success(t('inventory.itemCreated'));
      setShowNew(false);
      form.reset({ name: '', category: 'food', unit: 'kg', trackExpiry: false });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('inventory.subtitle')}</p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)}>
          <Plus className="h-4 w-4" />
          {t('inventory.newItem')}
        </Button>
      </header>

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.newItemTitle')}</CardTitle>
            <CardDescription>{t('inventory.newItemHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => {
                const dq = values.defaultQuantity ? Number(values.defaultQuantity) : undefined;
                const ms = values.minStock ? Number(values.minStock) : undefined;
                createMutation.mutate({
                  name: values.name,
                  category: values.category,
                  unit: values.unit,
                  trackExpiry: values.trackExpiry,
                  notes: values.notes,
                  defaultQuantity: dq && Number.isFinite(dq) && dq > 0 ? dq : undefined,
                  minStock: ms != null && Number.isFinite(ms) && ms >= 0 ? ms : undefined,
                });
              })}
            >
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="name">{t('inventory.itemName')}</Label>
                <Input id="name" {...form.register('name')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">{t('inventory.category')}</Label>
                <Input
                  id="category"
                  list="category-suggestions"
                  placeholder={t('inventory.categoryHint')}
                  {...form.register('category')}
                />
                <datalist id="category-suggestions">
                  {knownCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">{t('inventory.categoryFreeHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">{t('inventory.unit')}</Label>
                <Input id="unit" placeholder="kg, box, piece, L" {...form.register('unit')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultQuantity">{t('inventory.defaultQuantity')}</Label>
                <Input
                  id="defaultQuantity"
                  type="number"
                  step="any"
                  placeholder={t('inventory.defaultQuantityPlaceholder')}
                  {...form.register('defaultQuantity')}
                />
                <p className="text-xs text-muted-foreground">{t('inventory.defaultQuantityHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minStock">{t('inventory.minStock')}</Label>
                <Input id="minStock" type="number" step="any" {...form.register('minStock')} />
              </div>
              <div className="flex items-end gap-2">
                <input id="trackExpiry" type="checkbox" className="h-4 w-4" {...form.register('trackExpiry')} />
                <Label htmlFor="trackExpiry">{t('inventory.trackExpiry')}</Label>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="notes">{t('inventory.notes')}</Label>
                <Input id="notes" {...form.register('notes')} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-xs">
              <option value="">{t('inventory.allCategories')}</option>
              {knownCategories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : q.data && q.data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs uppercase text-muted-foreground">
                    <Th>{t('inventory.itemName')}</Th>
                    <Th>{t('inventory.category')}</Th>
                    <Th>{t('inventory.unit')}</Th>
                    <Th className="text-end">{t('inventory.defaultQuantityShort')}</Th>
                    <Th className="text-end">{t('inventory.currentStock')}</Th>
                    <Th className="text-end">{t('inventory.minStock')}</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((it) => (
                    <Row key={it.id} it={it} t={t} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('inventory.noItems')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 font-medium ${className ?? 'text-start'}`}>{children}</th>;
}

function Row({ it, t }: { it: InventoryItemListEntry; t: (k: string) => string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-2 py-2 font-medium">
        <Link href={`/inventory/${it.id}`} className="hover:underline">
          {it.name}
        </Link>
        {it.notes ? <div className="text-xs text-muted-foreground">{it.notes}</div> : null}
      </td>
      <td className="px-2 py-2">
        <Badge variant="muted">{it.category.replace(/_/g, ' ')}</Badge>
      </td>
      <td className="px-2 py-2 text-muted-foreground">{it.unit}</td>
      <td className="px-2 py-2 text-end text-muted-foreground tabular-nums">
        {it.defaultQuantity ?? '—'}
      </td>
      <td className="px-2 py-2 text-end tabular-nums font-semibold">
        <span className={it.belowMin ? 'text-amber-700' : undefined}>{it.currentStock}</span>
        {it.belowMin ? <AlertCircle className="ms-1 inline h-3 w-3 text-amber-600" /> : null}
      </td>
      <td className="px-2 py-2 text-end text-muted-foreground tabular-nums">{it.minStock ?? '—'}</td>
      <td className="px-2 py-2 text-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/inventory/${it.id}`}>
            <Package className="h-3 w-3" />
            {t('inventory.viewLots')}
          </Link>
        </Button>
      </td>
    </tr>
  );
}
