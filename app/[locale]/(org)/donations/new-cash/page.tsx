'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { MoneyInput } from '@/components/ui/money-input';
import { DateInput } from '@/components/ui/date-input';
import { createCashDonation } from '@/lib/api/donations';
import { searchDonors, type DonorSearchHit } from '@/lib/api/donors';
import { listCampaigns, listCampaignBeneficiaries, addCampaignBeneficiary, type CampaignListEntry } from '@/lib/api/campaigns';
import {
  searchBeneficiariesForDonationPick,
  type BeneficiaryDonationPickHit,
} from '@/lib/api/beneficiaries';
import { listInventoryItems, type InventoryItemListEntry } from '@/lib/api/inventory';
import { tndToMinor, DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { Trash2, Users, Plus, ChevronDown } from 'lucide-react';
import { BeneficiaryDonationPickRow } from '@/components/beneficiary-donation-pick-row';
const COMMON_CATEGORIES = ['food', 'medicine', 'clothing', 'school_supplies', 'hygiene', 'blankets', 'furniture'];

interface ItemGrantRow {
  id: string;
  item: InventoryItemListEntry;
  quantity: string;
}

let grantRowId = 0;
function nextGrantId(): string {
  grantRowId += 1;
  return String(grantRowId);
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIsoDate(): string {
  return toIsoDateLocal(new Date());
}

function minAllowedDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toIsoDateLocal(d);
}

const schema = z
  .object({
    /** Kept as string in the form; converted to a number at submit. Optional when giving items only. */
    amount: z.string().optional(),
    donorMode: z.enum(['registered', 'guest']),
    donorId: z.string().uuid().optional().or(z.literal('')),
    donorNameSnapshot: z.string().max(200).optional(),
    donorFiscalIdSnapshot: z.string().max(80).optional(),
    isAnonymous: z.boolean().optional(),
    receivedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => d >= minAllowedDate() && d <= todayIsoDate(), {
        message: 'Date must be within the last 7 days and not in the future',
      }),
    notes: z.string().max(2000).optional(),
    /** "unrestricted" | "category" | "campaign" */
    spendMode: z.enum(['unrestricted', 'category', 'campaign']),
    spendCategory: z.string().max(80).optional(),
    campaignId: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((v) => v.spendMode !== 'category' || (v.spendCategory && v.spendCategory.trim().length >= 2), {
    message: 'Pick a category',
    path: ['spendCategory'],
  })
  .refine((v) => v.spendMode !== 'campaign' || (v.campaignId && v.campaignId.length > 0), {
    message: 'Pick a campaign',
    path: ['campaignId'],
  })
  .refine((v) => v.donorMode !== 'registered' || (v.donorId && v.donorId.length > 0), {
    message: 'Select a donor account',
    path: ['donorId'],
  })
  .refine(
    (v) =>
      v.donorMode !== 'guest' ||
      v.isAnonymous ||
      (v.donorNameSnapshot && v.donorNameSnapshot.trim().length >= 2),
    { message: 'Enter donor name or mark as anonymous', path: ['donorNameSnapshot'] },
  );

type FormData = z.infer<typeof schema>;

export default function NewCashDonationPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [customCategory, setCustomCategory] = useState(false);
  const [donorSearch, setDonorSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDonor, setSelectedDonor] = useState<DonorSearchHit | null>(null);
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [debouncedBeneficiarySearch, setDebouncedBeneficiarySearch] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryDonationPickHit | null>(null);
  const [beneficiaryError, setBeneficiaryError] = useState<string | null>(null);
  const [itemGrants, setItemGrants] = useState<ItemGrantRow[]>([]);
  const [grantItemId, setGrantItemId] = useState('');
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const itemPickerRef = useRef<HTMLDivElement>(null);
  const [grantQty, setGrantQty] = useState('');
  const [grantError, setGrantError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(donorSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [donorSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBeneficiarySearch(beneficiarySearch.trim()), 300);
    return () => clearTimeout(t);
  }, [beneficiarySearch]);

  const { data: campaigns } = useQuery<CampaignListEntry[]>({
    queryKey: ['campaigns', 'active'],
    queryFn: () => listCampaigns(),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      donorMode: 'guest',
      donorId: '',
      isAnonymous: false,
      spendMode: 'unrestricted',
      spendCategory: '',
      campaignId: '',
      notes: '',
      receivedAt: todayIsoDate(),
    },
  });

  const spendMode = form.watch('spendMode');
  const campaignId = form.watch('campaignId');
  const donorMode = form.watch('donorMode');
  const isAnonymous = form.watch('isAnonymous');
  const receivedAt = form.watch('receivedAt');

  const selectedCampaign = (campaigns ?? []).find((c) => c.id === campaignId);
  const lookupFields = selectedCampaign?.beneficiaryLookupFields ?? ['name', 'phone', 'cin'];

  const donorsQ = useQuery({
    queryKey: ['donors-search', debouncedSearch],
    queryFn: () => searchDonors(debouncedSearch),
    enabled: donorMode === 'registered' && debouncedSearch.length >= 2,
  });

  const inventoryQ = useQuery({
    queryKey: ['inventory', 'items', 'pick'],
    queryFn: () => listInventoryItems({ limit: 200 }),
  });

  const sortedInventoryItems = useMemo(() => {
    const items = inventoryQ.data?.items ?? [];
    return [...items].sort((a, b) => {
      const aStock = a.currentStock > 0 ? 1 : 0;
      const bStock = b.currentStock > 0 ? 1 : 0;
      if (bStock !== aStock) return bStock - aStock;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [inventoryQ.data?.items]);

  const selectedGrantItem = useMemo(
    () => (inventoryQ.data?.items ?? []).find((i) => i.id === grantItemId) ?? null,
    [inventoryQ.data?.items, grantItemId],
  );

  const amountWatch = form.watch('amount');

  const beneficiariesQ = useQuery({
    queryKey: ['beneficiary-donation-pick', debouncedBeneficiarySearch, lookupFields.join(','), campaignId],
    queryFn: () =>
      searchBeneficiariesForDonationPick({
        q: debouncedBeneficiarySearch,
        fields: lookupFields,
        campaignId: campaignId || undefined,
      }),
    enabled: debouncedBeneficiarySearch.length >= 2,
  });

  const campaignBeneficiariesQ = useQuery({
    queryKey: ['campaign-beneficiaries', campaignId],
    queryFn: () => listCampaignBeneficiaries(campaignId!),
    enabled: spendMode === 'campaign' && !!campaignId,
  });

  const linkedCampaignBenIds = new Set(
    (campaignBeneficiariesQ.data?.items ?? []).map((b) => b.beneficiaryId),
  );

  useEffect(() => {
    if (spendMode !== 'category') form.setValue('spendCategory', '');
    if (spendMode !== 'campaign') {
      form.setValue('campaignId', '');
    }
  }, [spendMode, form]);

  useEffect(() => {
    setSelectedBeneficiary(null);
    setBeneficiarySearch('');
    setBeneficiaryError(null);
  }, [campaignId]);

  useEffect(() => {
    if (!itemPickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (itemPickerRef.current && !itemPickerRef.current.contains(e.target as Node)) {
        setItemPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemPickerOpen]);

  const totalAmountMinor = amountWatch && Number(amountWatch) > 0 ? tndToMinor(Number(amountWatch)) : 0;

  function pickBeneficiary(hit: BeneficiaryDonationPickHit) {
    const inCampaign = hit.inCampaign ?? linkedCampaignBenIds.has(hit.id);
    if (spendMode === 'campaign' && campaignId && !inCampaign) return;
    setSelectedBeneficiary({ ...hit, inCampaign: true });
    setBeneficiarySearch('');
    setBeneficiaryError(null);
  }

  async function addBeneficiaryToCampaign(hit: BeneficiaryDonationPickHit) {
    if (!campaignId) return;
    try {
      await addCampaignBeneficiary(campaignId, hit.id);
      await queryClient.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaignId] });
      await queryClient.invalidateQueries({
        queryKey: ['beneficiary-donation-pick', debouncedBeneficiarySearch, lookupFields.join(','), campaignId],
      });
      toast.success(t('donations.beneficiaryAddedToCampaign'));
      pickBeneficiary({ ...hit, inCampaign: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function addItemGrant() {
    setGrantError(null);
    if (!selectedBeneficiary) {
      setGrantError(t('donations.beneficiaryRequiredForItems'));
      return;
    }
    const item = sortedInventoryItems.find((i) => i.id === grantItemId);
    if (!item) {
      setGrantError(t('donations.itemGrantPickRequired'));
      return;
    }
    const qty = Number(grantQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setGrantError(t('donations.itemGrantQtyRequired'));
      return;
    }
    if (qty > item.currentStock) {
      setGrantError(
        t('donations.insufficientStock', {
          item: item.name,
          available: item.currentStock,
          needed: qty,
        }),
      );
      return;
    }
    const allocatedSameItem = itemGrants
      .filter((g) => g.item.id === item.id)
      .reduce((s, g) => s + Number(g.quantity), 0);
    if (allocatedSameItem + qty > item.currentStock) {
      setGrantError(
        t('donations.insufficientStock', {
          item: item.name,
          available: item.currentStock - allocatedSameItem,
          needed: qty,
        }),
      );
      return;
    }
    setItemGrants((rows) => [...rows, { id: nextGrantId(), item, quantity: grantQty }]);
    setGrantItemId('');
    setGrantQty('');
  }

  function removeItemGrant(id: string) {
    setItemGrants((rows) => rows.filter((r) => r.id !== id));
  }

  async function onSubmit(values: FormData) {
    setBeneficiaryError(null);
    setGrantError(null);
    const totalMinor =
      values.amount && Number(values.amount) > 0 ? tndToMinor(Number(values.amount)) : 0;

    if (totalMinor <= 0 && itemGrants.length === 0) {
      toast.error(t('donations.amountOrItemsRequired'));
      return;
    }

    const requiresBeneficiary = totalMinor > 0 || itemGrants.length > 0;
    if (requiresBeneficiary && !selectedBeneficiary) {
      setBeneficiaryError(t('donations.beneficiaryRequired'));
      return;
    }

    let splitsPayload: Array<{ beneficiaryId: string; amountMinor: number }> | undefined;
    if (
      values.spendMode === 'campaign' &&
      values.campaignId &&
      totalMinor > 0 &&
      selectedBeneficiary
    ) {
      splitsPayload = [{ beneficiaryId: selectedBeneficiary.id, amountMinor: totalMinor }];
    }

    const grantsPayload =
      itemGrants.length > 0 && selectedBeneficiary
        ? itemGrants.map((g) => ({
            beneficiaryId: selectedBeneficiary.id,
            itemId: g.item.id,
            quantity: Number(g.quantity),
          }))
        : undefined;

    try {
      await createCashDonation({
        amount: totalMinor,
        currency: DEFAULT_CURRENCY,
        ...(values.donorMode === 'registered' && values.donorId ? { donorId: values.donorId } : {}),
        donorNameSnapshot:
          values.donorMode === 'guest' && !values.isAnonymous
            ? values.donorNameSnapshot?.trim()
            : values.donorMode === 'registered' && selectedDonor
              ? selectedDonor.fullName
              : undefined,
        donorFiscalIdSnapshot:
          values.donorMode === 'guest'
            ? values.donorFiscalIdSnapshot || undefined
            : selectedDonor?.fiscalId ?? undefined,
        isAnonymous: values.donorMode === 'guest' ? values.isAnonymous : false,
        notes: values.notes || undefined,
        receivedAt: values.receivedAt,
        spendCategory:
          values.spendMode === 'category' && values.spendCategory ? values.spendCategory.trim() : undefined,
        campaignId:
          values.spendMode === 'campaign' && values.campaignId ? values.campaignId : undefined,
        beneficiarySplits: splitsPayload,
        itemGrants: grantsPayload,
      });
      await queryClient.invalidateQueries({ queryKey: ['donations'] });
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(t('common.successCreated'));
      router.push('/donations');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const selectableCampaigns = (campaigns ?? []).filter((c) => c.state === 'active');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('donations.newCash')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('donations.newCash')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount">
                  {t('donations.amount')} <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
                </Label>
                <MoneyInput
                  id="amount"
                  placeholder="50.000"
                  {...form.register('amount')}
                />
                {form.formState.errors.amount && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="currency">{t('donations.currency')}</Label>
                <Input id="currency" value={DEFAULT_CURRENCY} disabled readOnly />
              </div>
            </div>

            <div>
              <Label>{t('donations.donor')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['registered', 'guest'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      form.setValue('donorMode', mode);
                      setSelectedDonor(null);
                      form.setValue('donorId', '');
                      if (mode === 'registered') form.setValue('isAnonymous', false);
                    }}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      donorMode === mode ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    {t(`donations.donorMode${mode === 'registered' ? 'Registered' : 'Guest'}`)}
                  </button>
                ))}
              </div>
              {donorMode === 'registered' ? (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder={t('donations.searchDonorHint')}
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                  />
                  {selectedDonor ? (
                    <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      {selectedDonor.fullName}
                      {selectedDonor.phone ? ` · ${selectedDonor.phone}` : ''}
                    </p>
                  ) : null}
                  {debouncedSearch.length >= 2 && !selectedDonor ? (
                    <ul className="max-h-40 overflow-y-auto rounded-md border">
                      {(donorsQ.data ?? []).length === 0 && !donorsQ.isLoading ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{t('donations.noDonorFound')}</li>
                      ) : null}
                      {(donorsQ.data ?? []).map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSelectedDonor(hit);
                              form.setValue('donorId', hit.id, { shouldValidate: true });
                            }}
                          >
                            <span className="font-medium">{hit.fullName}</span>
                            {hit.phone ? (
                              <span className="text-muted-foreground"> · {hit.phone}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {form.formState.errors.donorId ? (
                    <p className="text-xs text-destructive">{form.formState.errors.donorId.message}</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="donorNameSnapshot">{t('donations.donorName')}</Label>
                    <Input
                      id="donorNameSnapshot"
                      disabled={isAnonymous}
                      {...form.register('donorNameSnapshot')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="donorFiscalIdSnapshot">{t('donations.donorFiscalId')}</Label>
                    <Input
                      id="donorFiscalIdSnapshot"
                      disabled={isAnonymous}
                      {...form.register('donorFiscalIdSnapshot')}
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input id="isAnonymous" type="checkbox" {...form.register('isAnonymous')} />
                    <Label htmlFor="isAnonymous">{t('donations.anonymous')}</Label>
                  </div>
                  {form.formState.errors.donorNameSnapshot ? (
                    <p className="text-xs text-destructive sm:col-span-2">
                      {form.formState.errors.donorNameSnapshot.message}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="receivedAt">{t('donations.receivedAt')}</Label>
                <DateInput
                  id="receivedAt"
                  min={minAllowedDate()}
                  max={todayIsoDate()}
                  value={receivedAt}
                  onChange={(e) =>
                    form.setValue('receivedAt', e.target.value, { shouldValidate: true, shouldDirty: true })
                  }
                />
                {form.formState.errors.receivedAt && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.receivedAt.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <Label className="text-base">{t('donations.spendPreference')}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['unrestricted', 'category', 'campaign'] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition ${
                      spendMode === mode
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-background hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      value={mode}
                      {...form.register('spendMode')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{t(`donations.spendModes.${mode}`)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`donations.spendModes.${mode}_hint`)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {spendMode === 'category' && (
                <div className="space-y-2">
                  <Label htmlFor="spendCategory">{t('donations.category')}</Label>
                  {!customCategory ? (
                    <div className="flex flex-wrap gap-2">
                      {COMMON_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => form.setValue('spendCategory', cat, { shouldValidate: true })}
                          className={`rounded-full border px-3 py-1 text-sm ${
                            form.watch('spendCategory') === cat
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background hover:border-primary/40'
                          }`}
                        >
                          {cat.replace(/_/g, ' ')}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomCategory(true)}
                        className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        + {t('donations.customCategory')}
                      </button>
                    </div>
                  ) : (
                    <Input
                      id="spendCategory"
                      placeholder={t('donations.customCategoryPlaceholder')}
                      {...form.register('spendCategory')}
                    />
                  )}
                  {form.formState.errors.spendCategory && (
                    <p className="text-xs text-destructive">{form.formState.errors.spendCategory.message}</p>
                  )}
                </div>
              )}

              {spendMode === 'campaign' && (
                <div className="space-y-2">
                  <Label htmlFor="campaignId">{t('donations.campaign')}</Label>
                  {selectableCampaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('donations.noActiveCampaign')}</p>
                  ) : (
                    <Select id="campaignId" {...form.register('campaignId')}>
                      <option value="">— {t('donations.selectCampaign')} —</option>
                      {selectableCampaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.state === 'draft' ? ` (${t('campaigns.state_draft')})` : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                  {form.formState.errors.campaignId && (
                    <p className="text-xs text-destructive">{form.formState.errors.campaignId.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-md border border-border bg-background p-3">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t('donations.donationBeneficiary')}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('donations.singleBeneficiaryHint')}
                  </p>
                </div>

                {selectedBeneficiary ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{selectedBeneficiary.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedBeneficiary.code}
                        {selectedBeneficiary.priorAllocatedMinor > 0
                          ? ` · ${t('donations.priorOnCampaign', {
                              amount: formatMoney(
                                selectedBeneficiary.priorAllocatedMinor,
                                DEFAULT_CURRENCY,
                              ),
                            })}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBeneficiary(null)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder={t('donations.searchBeneficiaryPlaceholder')}
                      value={beneficiarySearch}
                      onChange={(e) => setBeneficiarySearch(e.target.value)}
                    />
                    {debouncedBeneficiarySearch.length >= 2 ? (
                      <ul className="max-h-36 overflow-y-auto rounded-md border">
                        {(beneficiariesQ.data?.items ?? []).length === 0 && !beneficiariesQ.isLoading ? (
                          <li className="px-3 py-2 text-sm text-muted-foreground">
                            {t('donations.noBeneficiaryFound')}
                          </li>
                        ) : null}
                        {(beneficiariesQ.data?.items ?? []).map((hit) => {
                          const inCampaign = hit.inCampaign ?? linkedCampaignBenIds.has(hit.id);
                          const campaignBlocks = spendMode === 'campaign' && !!campaignId && !inCampaign;
                          return (
                            <BeneficiaryDonationPickRow
                              key={hit.id}
                              hit={hit}
                              disabled={campaignBlocks}
                              dimmed={campaignBlocks}
                              onPick={() => pickBeneficiary(hit)}
                              onAddToCampaign={
                                campaignBlocks ? () => addBeneficiaryToCampaign(hit) : undefined
                              }
                              priorLabel={
                                hit.priorAllocatedMinor > 0
                                  ? t('donations.priorOnCampaign', {
                                      amount: formatMoney(hit.priorAllocatedMinor, DEFAULT_CURRENCY),
                                    })
                                  : undefined
                              }
                              notOnCampaignLabel={
                                campaignBlocks ? t('donations.notOnCampaignList') : undefined
                              }
                              addToCampaignTitle={t('donations.addToCampaignListHint')}
                            />
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                )}
                {beneficiaryError ? (
                  <p className="text-xs text-destructive">{beneficiaryError}</p>
                ) : null}
              </div>

            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <Label>{t('donations.giveItemsToBeneficiary')}</Label>
              <p className="text-xs text-muted-foreground">{t('donations.giveItemsHint')}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="relative space-y-1" ref={itemPickerRef}>
                  <Label>{t('inventory.itemName')}</Label>
                  <button
                    type="button"
                    onClick={() => setItemPickerOpen((open) => !open)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm shadow-sm hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={selectedGrantItem ? 'truncate' : 'truncate text-muted-foreground'}>
                      {selectedGrantItem
                        ? `${selectedGrantItem.name} (${t('inventory.currentStock')}: ${selectedGrantItem.currentStock} ${selectedGrantItem.unit})`
                        : `— ${t('donations.selectItem')} —`}
                    </span>
                    <ChevronDown
                      className={`ms-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${itemPickerOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {itemPickerOpen ? (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
                      {inventoryQ.isLoading ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{t('common.loading')}</li>
                      ) : inventoryQ.isError ? (
                        <li className="px-3 py-2 text-sm text-destructive">
                          {(inventoryQ.error as Error).message}
                        </li>
                      ) : sortedInventoryItems.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{t('inventory.noItems')}</li>
                      ) : (
                        sortedInventoryItems.map((it) => (
                          <li key={it.id} className="border-b border-border last:border-0">
                            <button
                              type="button"
                              disabled={it.currentStock <= 0}
                              className={`w-full px-3 py-2 text-left text-sm ${
                                it.currentStock > 0
                                  ? 'hover:bg-muted'
                                  : 'cursor-not-allowed text-muted-foreground opacity-60'
                              } ${grantItemId === it.id ? 'bg-primary/10' : ''}`}
                              onClick={() => {
                                setGrantItemId(it.id);
                                setItemPickerOpen(false);
                              }}
                            >
                              {it.name} ({t('inventory.currentStock')}: {it.currentStock} {it.unit})
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>{t('donations.quantity')}</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={grantQty}
                    onChange={(e) => setGrantQty(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItemGrant}>
                <Plus className="h-3.5 w-3.5" />
                {t('donations.addItemGrant')}
              </Button>
              {grantError ? <p className="text-xs text-destructive">{grantError}</p> : null}
              {itemGrants.length > 0 ? (
                <ul className="space-y-2">
                  {itemGrants.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background p-2 text-sm"
                    >
                      <span>
                        {row.quantity} {row.item.unit} {row.item.name}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItemGrant(row.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <Label htmlFor="notes">{t('donations.notes')}</Label>
              <Input id="notes" {...form.register('notes')} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t('common.create')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
