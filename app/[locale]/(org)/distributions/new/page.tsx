'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Coins, Gift, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MoneyInput } from '@/components/ui/money-input';
import { DateInput } from '@/components/ui/date-input';
import { Link, useRouter } from '@/i18n/navigation';
import { listBeneficiaries } from '@/lib/api/beneficiaries';
import { listInventoryItems } from '@/lib/api/inventory';
import { listCampaigns } from '@/lib/api/campaigns';
import {
  createDistribution,
  type CreateDistributionInput,
  type DistributionKind,
} from '@/lib/api/distributions';
import { tndToMinor, DEFAULT_CURRENCY, formatTnd } from '@/lib/money';
import { donationStats } from '@/lib/api/donations';
import { cn, formatTndMinor } from '@/lib/utils';
import { AvailableBalanceBanner } from '@/components/available-balance-banner';

interface CashLine {
  id: string;
  lineKind: 'cash';
  amountTnd: number;
}

interface ItemLine {
  id: string;
  lineKind: 'item';
  itemId: string;
  quantity: number;
}

type Line = CashLine | ItemLine;

let nextId = 0;
function localId(): string {
  nextId += 1;
  return String(nextId);
}

export default function NewDistributionPage() {
  const t = useTranslations();
  const router = useRouter();

  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [kind, setKind] = useState<DistributionKind>('cash');
  const [campaignId, setCampaignId] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'planned' | 'now'>('planned');
  const [plannedAt, setPlannedAt] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { id: localId(), lineKind: 'cash', amountTnd: 0 },
  ]);

  const statsQ = useQuery({ queryKey: ['donation-stats'], queryFn: () => donationStats() });

  const benQ = useQuery({ queryKey: ['ben', 'all'], queryFn: () => listBeneficiaries({ limit: 200 }) });
  const itemsQ = useQuery({ queryKey: ['inventory', 'items', 'all'], queryFn: () => listInventoryItems({ limit: 200 }) });
  const campaignsQ = useQuery({ queryKey: ['campaigns'], queryFn: listCampaigns });

  const createMut = useMutation({
    mutationFn: (payload: CreateDistributionInput) => createDistribution(payload),
    onSuccess: () => {
      toast.success(deliveryMode === 'now' ? t('distributions.delivered') : t('distributions.created'));
      router.push('/distributions');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  function addCash() {
    setLines((l) => [...l, { id: localId(), lineKind: 'cash', amountTnd: 0 }]);
  }
  function addItem() {
    const firstItem = itemsQ.data?.items[0];
    setLines((l) => [
      ...l,
      {
        id: localId(),
        lineKind: 'item',
        itemId: '',
        quantity: firstItem?.defaultQuantity ?? 1,
      },
    ]);
  }
  function remove(id: string) {
    setLines((l) => l.filter((x) => x.id !== id));
  }
  function update<T extends Line>(id: string, patch: Partial<T>) {
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)) as Line[]);
  }

  const selectedCampaign = campaignsQ.data?.find((c) => c.id === campaignId);
  const campaignAvailableMinor =
    selectedCampaign != null
      ? Math.max(
          0,
          selectedCampaign.collectedAmountMinor - selectedCampaign.distributedAmountMinor,
        )
      : null;

  const totalCashMinor = lines
    .filter((l): l is CashLine => l.lineKind === 'cash')
    .reduce((sum, l) => sum + tndToMinor(l.amountTnd), 0);
  const departmentBalanceMinor = statsQ.data?.availableBalanceMinor ?? 0;
  const effectiveAvailableMinor =
    campaignId && campaignAvailableMinor != null ? campaignAvailableMinor : departmentBalanceMinor;
  const exceedsBalance = totalCashMinor > effectiveAvailableMinor;

  function submit() {
    if (!beneficiaryId) {
      toast.error(t('distributions.errBeneficiary'));
      return;
    }
    if (deliveryMode === 'planned' && exceedsBalance && totalCashMinor > 0) {
      toast.error(
        t('distributions.errExceedsBalance', {
          available: formatTndMinor(effectiveAvailableMinor),
        }),
      );
      return;
    }
    if (lines.length === 0) {
      toast.error(t('distributions.errLines'));
      return;
    }
    for (const ln of lines) {
      if (ln.lineKind === 'cash' && ln.amountTnd <= 0) {
        toast.error(t('distributions.errCashLine'));
        return;
      }
      if (ln.lineKind === 'item' && (!ln.itemId || ln.quantity <= 0)) {
        toast.error(t('distributions.errItemLine'));
        return;
      }
    }
    const payload: CreateDistributionInput = {
      beneficiaryId,
      kind,
      plannedAt: deliveryMode === 'planned' && plannedAt ? new Date(plannedAt).toISOString() : undefined,
      campaignId: campaignId || undefined,
      deliverNow: deliveryMode === 'now',
      lines: lines.map((l) =>
        l.lineKind === 'cash'
          ? {
              lineKind: 'cash',
              amountMinor: tndToMinor(l.amountTnd),
              currency: DEFAULT_CURRENCY,
            }
          : { lineKind: 'item', itemId: l.itemId, quantity: l.quantity },
      ),
    };
    createMut.mutate(payload);
  }

  const hasCash = lines.some((l) => l.lineKind === 'cash');
  const hasItem = lines.some((l) => l.lineKind === 'item');
  const suggestedKind: DistributionKind = hasCash && hasItem ? 'mixed' : hasItem ? 'goods' : 'cash';

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="ghost" size="sm" className="-ms-2 h-7 px-2 text-muted-foreground">
          <Link href="/distributions">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t('distributions.newTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('distributions.newSubtitle')}</p>
      </header>

      <AvailableBalanceBanner />

      <Card>
        <CardHeader>
          <CardTitle>{t('distributions.detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="beneficiaryId">{t('distributions.beneficiary')}</Label>
            <Select id="beneficiaryId" value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
              <option value="">—</option>
              {benQ.data?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} {b.publicAlias ? `· ${b.publicAlias}` : ''} · {b.status}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>{t('distributions.deliveryMode')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['planned', 'now'] as const).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${
                    deliveryMode === m
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value={m}
                    checked={deliveryMode === m}
                    onChange={() => setDeliveryMode(m)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{t(`distributions.delivery_${m}`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`distributions.delivery_${m}_hint`)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kind">{t('distributions.kind')}</Label>
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as DistributionKind)}>
              <option value="cash">{t('distributions.kind_cash')}</option>
              <option value="goods">{t('distributions.kind_goods')}</option>
              <option value="mixed">{t('distributions.kind_mixed')}</option>
            </Select>
            {kind !== suggestedKind ? (
              <p className="text-xs text-amber-700">
                {t('distributions.kindHint')}: {t(`distributions.kind_${suggestedKind}`)}
              </p>
            ) : null}
          </div>

          {deliveryMode === 'planned' && (
            <div className="space-y-1.5">
              <Label htmlFor="plannedAt">{t('distributions.plannedAt')}</Label>
              <DateInput id="plannedAt" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="campaignId">{t('distributions.campaign')}</Label>
            <Select id="campaignId" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">{t('distributions.noCampaign')}</option>
              {campaignsQ.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.state}
                </option>
              ))}
            </Select>
            {selectedCampaign && campaignAvailableMinor != null ? (
              <div className="mt-2 rounded-md border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <span className="text-muted-foreground">{t('distributions.campaignAvailable')}: </span>
                <span className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                  {formatTndMinor(campaignAvailableMinor)} {selectedCampaign.currency}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('distributions.campaignAvailableHint')}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t('distributions.linesTitle')}</CardTitle>
              <CardDescription>{t('distributions.linesHint')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addCash}>
                <Coins className="h-3 w-3" />
                {t('distributions.addCash')}
              </Button>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Gift className="h-3 w-3" />
                {t('distributions.addItem')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('distributions.noLinesYet')}</p>
          ) : (
            lines.map((line) =>
              line.lineKind === 'cash' ? (
                <div
                  key={line.id}
                  className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_160px_auto]"
                >
                  <div>
                    <Label>
                      {t('distributions.amount')}{' '}
                      <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
                    </Label>
                    <MoneyInput
                      placeholder="50.000"
                      value={line.amountTnd || ''}
                      onValueChange={(v) => update<CashLine>(line.id, { amountTnd: v })}
                      className={cn(
                        exceedsBalance &&
                          line.amountTnd > 0 &&
                          'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('distributions.currency')}</Label>
                    <Input value={DEFAULT_CURRENCY} disabled readOnly />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={() => remove(line.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {line.amountTnd > 0 && (
                    <p
                      className={cn(
                        'text-xs md:col-span-3',
                        exceedsBalance ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      = {formatTnd(line.amountTnd)}
                    </p>
                  )}
                </div>
              ) : (
                <div
                  key={line.id}
                  className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 md:grid-cols-[2fr_140px_auto]"
                >
                  <div>
                    <Label>{t('distributions.item')}</Label>
                    <Select
                      value={line.itemId}
                      onChange={(e) => {
                        const selectedItem = itemsQ.data?.items.find((it) => it.id === e.target.value);
                        update<ItemLine>(line.id, {
                          itemId: e.target.value,
                          quantity: selectedItem?.defaultQuantity ?? line.quantity ?? 1,
                        });
                      }}
                    >
                      <option value="">—</option>
                      {itemsQ.data?.items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.unit}) — stock: {it.currentStock}
                          {it.defaultQuantity ? ` · ${t('distributions.packOf', { n: it.defaultQuantity })}` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{t('distributions.quantity')}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={line.quantity || ''}
                      onChange={(e) => update<ItemLine>(line.id, { quantity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={() => remove(line.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ),
            )
          )}
          {exceedsBalance && totalCashMinor > 0 ? (
            <p className="text-sm text-destructive">{t('distributions.exceedsBalanceHint')}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/distributions">{t('common.cancel')}</Link>
        </Button>
        <Button onClick={submit} disabled={createMut.isPending}>
          {createMut.isPending
            ? t('common.loading')
            : deliveryMode === 'now'
              ? t('distributions.deliverButton')
              : t('distributions.planButton')}
        </Button>
      </div>
    </div>
  );
}
