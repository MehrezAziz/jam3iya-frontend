'use client';

import { useEffect, useState } from 'react';
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
import { listCampaigns, type CampaignListEntry } from '@/lib/api/campaigns';
import { tndToMinor, DEFAULT_CURRENCY } from '@/lib/money';
import { AvailableBalanceBanner } from '@/components/available-balance-banner';

const COMMON_CATEGORIES = ['food', 'medicine', 'clothing', 'school_supplies', 'hygiene', 'blankets', 'furniture'];

function todayIsoDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function minAllowedDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

const schema = z
  .object({
    /** Kept as string in the form; converted to a number at submit. */
    amount: z
      .string()
      .min(1, 'Amount required')
      .refine((s) => Number(s) > 0, 'Amount must be > 0'),
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(donorSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [donorSearch]);

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
  const donorMode = form.watch('donorMode');
  const isAnonymous = form.watch('isAnonymous');
  const donorsQ = useQuery({
    queryKey: ['donors-search', debouncedSearch],
    queryFn: () => searchDonors(debouncedSearch),
    enabled: donorMode === 'registered' && debouncedSearch.length >= 2,
  });

  useEffect(() => {
    if (spendMode !== 'category') form.setValue('spendCategory', '');
    if (spendMode !== 'campaign') form.setValue('campaignId', '');
  }, [spendMode, form]);

  async function onSubmit(values: FormData) {
    try {
      await createCashDonation({
        amount: tndToMinor(Number(values.amount)),
        currency: DEFAULT_CURRENCY,
        donorId: values.donorMode === 'registered' && values.donorId ? values.donorId : undefined,
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
      });
      await queryClient.invalidateQueries({ queryKey: ['donations'] });
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(t('common.successCreated'));
      router.push('/donations');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const selectableCampaigns = (campaigns ?? []).filter((c) => c.state !== 'closed');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('donations.newCash')}</h1>
      <AvailableBalanceBanner />
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
                  {...form.register('receivedAt')}
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
