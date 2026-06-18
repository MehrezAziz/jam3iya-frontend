'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Calendar, Eye, EyeOff, Megaphone, Pencil, Plus, Sparkles, Target, Trash2, Users, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/ui/money-input';
import { DateInput } from '@/components/ui/date-input';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  listCampaignDonations,
  listCampaignBeneficiaries,
  addCampaignBeneficiary,
  quickAddCampaignBeneficiary,
  removeCampaignBeneficiary,
  listCampaignBeneficiaryAllocations,
  updateCampaignBeneficiarySplit,
  markCampaignBeneficiarySplitPaid,
  unmarkCampaignBeneficiarySplitPaid,
  type CampaignBeneficiaryAllocation,
  type CampaignBeneficiaryAllocationSplit,
  listOccasions,
  createOccasion,
  type CampaignListEntry,
  type BeneficiaryLookupField,
} from '@/lib/api/campaigns';
import {
  searchBeneficiariesForDonationPick,
  type BeneficiaryDonationPickHit,
} from '@/lib/api/beneficiaries';
import { BeneficiaryDonationPickRow } from '@/components/beneficiary-donation-pick-row';
import { tndToMinor, formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

const LOOKUP_FIELDS: BeneficiaryLookupField[] = ['name', 'phone', 'cin', 'code'];

const campaignSchema = z
  .object({
    name: z.string().min(2).max(160),
    description: z.string().max(2000).optional(),
    occasionId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    noEndDate: z.boolean(),
    endsAt: z.string().optional(),
    /** Target amount in TND (major units, free text); converted to minor at submit time. */
    targetAmountTnd: z.string().optional(),
    state: z.enum(['draft', 'active', 'closed']),
    visibleOnPublicPage: z.boolean(),
    beneficiaryLookupFields: z.array(z.enum(['name', 'phone', 'cin', 'code'])).min(1),
  })
  .superRefine((d, ctx) => {
    if (d.noEndDate) return;
    if (!d.endsAt || !/^\d{4}-\d{2}-\d{2}$/.test(d.endsAt)) {
      ctx.addIssue({ code: 'custom', message: 'End date required', path: ['endsAt'] });
      return;
    }
    if (d.startsAt > d.endsAt) {
      ctx.addIssue({ code: 'custom', message: 'startsAt must be before endsAt', path: ['endsAt'] });
    }
  });
type CampaignForm = z.infer<typeof campaignSchema>;

const occasionSchema = z
  .object({
    name: z.string().min(2).max(160),
    description: z.string().max(2000).optional(),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    noEndDate: z.boolean(),
    isHijriBased: z.boolean(),
    recurring: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.noEndDate) return;
    if (!d.periodEnd) {
      ctx.addIssue({ code: 'custom', message: 'periodEnd required', path: ['periodEnd'] });
      return;
    }
    if (d.periodStart > d.periodEnd) {
      ctx.addIssue({ code: 'custom', message: 'periodStart must be before periodEnd', path: ['periodEnd'] });
    }
  });
type OccasionForm = z.infer<typeof occasionSchema>;

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CampaignsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewOccasion, setShowNewOccasion] = useState(false);

  const campaignsQ = useQuery({ queryKey: ['campaigns'], queryFn: listCampaigns });
  const occasionsQ = useQuery({ queryKey: ['occasions'], queryFn: listOccasions });

  const cForm = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      state: 'draft',
      visibleOnPublicPage: true,
      startsAt: '',
      endsAt: '',
      noEndDate: false,
      beneficiaryLookupFields: ['name', 'phone', 'cin'],
    },
  });
  const noEndDate = cForm.watch('noEndDate');
  const startsAtWatch = cForm.watch('startsAt');

  useEffect(() => {
    if (!showNewCampaign) return;
    if (!startsAtWatch || !/^\d{4}-\d{2}-\d{2}$/.test(startsAtWatch)) return;
    const today = todayIsoDate();
    cForm.setValue('state', startsAtWatch <= today ? 'active' : 'draft', { shouldDirty: true });
  }, [startsAtWatch, showNewCampaign, cForm]);

  const oForm = useForm<OccasionForm>({
    resolver: zodResolver(occasionSchema),
    defaultValues: {
      name: '',
      isHijriBased: false,
      recurring: false,
      periodStart: '',
      periodEnd: '',
      noEndDate: false,
    },
  });
  const occasionNoEndDate = oForm.watch('noEndDate');

  const createC = useMutation({
    mutationFn: (v: CampaignForm) => {
      const targetTnd = v.targetAmountTnd ? Number(v.targetAmountTnd) : 0;
      return createCampaign({
        name: v.name,
        description: v.description || undefined,
        occasionId: v.occasionId || undefined,
        startsAt: v.startsAt,
        endsAt: v.noEndDate ? null : v.endsAt,
        targetAmountMinor: targetTnd > 0 ? tndToMinor(targetTnd) : undefined,
        currency: DEFAULT_CURRENCY,
        visibleOnPublicPage: v.visibleOnPublicPage,
        state: v.state,
        beneficiaryLookupFields: v.beneficiaryLookupFields,
      });
    },
    onSuccess: () => {
      toast.success(t('campaigns.created'));
      cForm.reset();
      setShowNewCampaign(false);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const createO = useMutation({
    mutationFn: (v: OccasionForm) =>
      createOccasion({
        name: v.name,
        description: v.description || undefined,
        periodStart: v.periodStart,
        periodEnd: v.noEndDate ? null : v.periodEnd || null,
        isHijriBased: v.isHijriBased,
        recurring: v.recurring,
      }),
    onSuccess: () => {
      toast.success(t('campaigns.occasionCreated'));
      oForm.reset();
      setShowNewOccasion(false);
      qc.invalidateQueries({ queryKey: ['occasions'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.campaigns')}</h1>
        <p className="text-sm text-muted-foreground">{t('campaigns.subtitle')}</p>
      </header>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                {t('campaigns.campaignsTitle')}
              </CardTitle>
              <CardDescription>{t('campaigns.campaignsHint')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowNewCampaign((v) => !v)}>
              <Plus className="h-3 w-3" />
              {t('campaigns.newCampaign')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewCampaign && (
            <form
              className="mb-4 grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/30 p-3 md:grid-cols-2"
              onSubmit={cForm.handleSubmit((v) => createC.mutate(v))}
            >
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="cname">{t('campaigns.name')}</Label>
                <Input id="cname" {...cForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cstart">{t('campaigns.startsAt')}</Label>
                <DateInput id="cstart" {...cForm.register('startsAt')} />
                <p className="text-xs text-muted-foreground">{t('campaigns.startsAtStateHint')}</p>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="cend">{t('campaigns.endsAt')}</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      id="cnoend"
                      type="checkbox"
                      className="h-4 w-4"
                      {...cForm.register('noEndDate', {
                        onChange: (e) => {
                          if (e.target.checked) cForm.setValue('endsAt', '');
                        },
                      })}
                    />
                    {t('campaigns.noEndDate')}
                  </label>
                </div>
                {!noEndDate ? <DateInput id="cend" {...cForm.register('endsAt')} /> : null}
                <p className="text-xs text-muted-foreground">{t('campaigns.endsAtAutoCloseHint')}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ctarget">
                  {t('campaigns.target')} <span className="text-muted-foreground">({DEFAULT_CURRENCY})</span>
                </Label>
                <MoneyInput id="ctarget" placeholder="0.000" {...cForm.register('targetAmountTnd')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cocc">{t('campaigns.occasion')}</Label>
                <Select id="cocc" {...cForm.register('occasionId')}>
                  <option value="">—</option>
                  {occasionsQ.data?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cstate">{t('campaigns.state')}</Label>
                <Select id="cstate" {...cForm.register('state')}>
                  <option value="draft">{t('campaigns.state_draft')}</option>
                  <option value="active">{t('campaigns.state_active')}</option>
                  <option value="closed">{t('campaigns.state_closed')}</option>
                </Select>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input id="cpub" type="checkbox" className="h-4 w-4" {...cForm.register('visibleOnPublicPage')} />
                <Label htmlFor="cpub">{t('campaigns.visibleOnPublic')}</Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('campaigns.beneficiaryLookupFields')}</Label>
                <p className="text-xs text-muted-foreground">{t('campaigns.beneficiaryLookupFieldsHint')}</p>
                <div className="flex flex-wrap gap-3">
                  {LOOKUP_FIELDS.map((field) => {
                    const selected = cForm.watch('beneficiaryLookupFields') ?? [];
                    return (
                      <label key={field} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selected.includes(field)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, field]
                              : selected.filter((f) => f !== field);
                            if (next.length > 0) {
                              cForm.setValue('beneficiaryLookupFields', next, { shouldValidate: true });
                            }
                          }}
                        />
                        {t(`campaigns.lookupField_${field}`)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="cdesc">{t('campaigns.description')}</Label>
                <Input id="cdesc" {...cForm.register('description')} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewCampaign(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createC.isPending}>
                  {createC.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </div>
            </form>
          )}

          {campaignsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : campaignsQ.data && campaignsQ.data.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {campaignsQ.data.map((c) => (
                <CampaignCard key={c.id} c={c} onUpdated={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('campaigns.noCampaigns')}</p>
          )}
        </CardContent>
      </Card>

      {/* Occasions */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('campaigns.occasionsTitle')}
              </CardTitle>
              <CardDescription>{t('campaigns.occasionsHint')}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowNewOccasion((v) => !v)}>
              <Plus className="h-3 w-3" />
              {t('campaigns.newOccasion')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewOccasion && (
            <form
              className="mb-4 grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/30 p-3 md:grid-cols-2"
              onSubmit={oForm.handleSubmit((v) => createO.mutate(v))}
            >
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="oname">{t('campaigns.name')}</Label>
                <Input id="oname" {...oForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ostart">{t('campaigns.periodStart')}</Label>
                <DateInput id="ostart" {...oForm.register('periodStart')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="oend">{t('campaigns.periodEnd')}</Label>
                <DateInput id="oend" disabled={occasionNoEndDate} {...oForm.register('periodEnd')} />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input id="onoend" type="checkbox" className="h-4 w-4" {...oForm.register('noEndDate')} />
                <Label htmlFor="onoend">{t('campaigns.noEndDate')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="ohij" type="checkbox" className="h-4 w-4" {...oForm.register('isHijriBased')} />
                <Label htmlFor="ohij">{t('campaigns.isHijriBased')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="orec" type="checkbox" className="h-4 w-4" {...oForm.register('recurring')} />
                <Label htmlFor="orec">{t('campaigns.recurring')}</Label>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="odesc">{t('campaigns.description')}</Label>
                <Input id="odesc" {...oForm.register('description')} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewOccasion(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createO.isPending}>
                  {createO.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </div>
            </form>
          )}

          {occasionsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : occasionsQ.data && occasionsQ.data.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {occasionsQ.data.map((o) => (
                <li key={o.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.name}</div>
                    <Badge variant={o.isHijriBased ? 'default' : 'muted'}>
                      {o.isHijriBased ? t('campaigns.hijri') : t('campaigns.gregorian')}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <Calendar className="me-1 inline h-3 w-3" />
                    {formatDate(o.periodStart)} → {o.periodEnd ? formatDate(o.periodEnd) : t('campaigns.openEnded')}
                    {o.recurring ? <span className="ms-2">· {t('campaigns.recurring')}</span> : null}
                  </div>
                  {o.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{o.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('campaigns.noOccasions')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignCard({
  c,
  onUpdated,
}: {
  c: CampaignListEntry;
  onUpdated: () => void;
}) {
  const t = useTranslations();
  const [showDonations, setShowDonations] = useState(false);
  const donationsQ = useQuery({
    queryKey: ['campaign-donations', c.id],
    queryFn: () => listCampaignDonations(c.id),
    enabled: showDonations,
  });
  const [editing, setEditing] = useState(false);
  const [startsAt, setStartsAt] = useState(c.startsAt.slice(0, 10));
  const [noEndDate, setNoEndDate] = useState(!c.endsAt);
  const [endsAt, setEndsAt] = useState(c.endsAt ? c.endsAt.slice(0, 10) : '');
  const [targetTnd, setTargetTnd] = useState(
    c.targetAmountMinor ? String(c.targetAmountMinor / 1000) : '',
  );
  const [lookupFields, setLookupFields] = useState<BeneficiaryLookupField[]>(
    c.beneficiaryLookupFields?.length ? c.beneficiaryLookupFields : ['name', 'phone', 'cin'],
  );
  const saveMut = useMutation({
    mutationFn: () =>
      updateCampaign(c.id, {
        startsAt,
        endsAt: noEndDate ? null : endsAt,
        targetAmountMinor: targetTnd ? tndToMinor(Number(targetTnd)) : null,
        beneficiaryLookupFields: lookupFields,
      }),
    onSuccess: () => {
      toast.success(t('common.successUpdated'));
      setEditing(false);
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const target = c.targetAmountMinor ?? 0;
  const collected = c.collectedAmountMinor;
  const distributed = c.distributedAmountMinor;
  const available = Math.max(0, collected - distributed);
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : null;
  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{c.name}</h3>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Badge variant={c.state === 'active' ? 'success' : c.state === 'closed' ? 'muted' : 'warning'}>
            {t(`campaigns.state_${c.state}`)}
          </Badge>
        </div>
      </div>
      {editing && (
        <form
          className="mt-3 grid gap-2 rounded border border-border bg-muted/30 p-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('campaigns.startsAt')}</Label>
              <DateInput value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <Label>{t('campaigns.endsAt')}</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={noEndDate}
                    onChange={(e) => {
                      setNoEndDate(e.target.checked);
                      if (e.target.checked) setEndsAt('');
                    }}
                  />
                  {t('campaigns.noEndDate')}
                </label>
              </div>
              {!noEndDate ? (
                <DateInput value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              ) : null}
            </div>
          </div>
          <div>
            <Label>{t('campaigns.targetAmount')}</Label>
            <MoneyInput value={targetTnd} onValueChange={(v) => setTargetTnd(String(v))} />
          </div>
          <div className="space-y-2">
            <Label>{t('campaigns.beneficiaryLookupFields')}</Label>
            <div className="flex flex-wrap gap-3">
              {LOOKUP_FIELDS.map((field) => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={lookupFields.includes(field)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...lookupFields, field]
                        : lookupFields.filter((f) => f !== field);
                      if (next.length > 0) setLookupFields(next);
                    }}
                  />
                  {t(`campaigns.lookupField_${field}`)}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" disabled={saveMut.isPending}>
            {t('common.update')}
          </Button>
        </form>
      )}
      <div className="mt-1 text-xs text-muted-foreground">
        <Calendar className="me-1 inline h-3 w-3" />
        {formatDate(c.startsAt)} → {formatCampaignEnd(c.endsAt, t)}
        {c.occasion ? <span className="ms-2">· {c.occasion.name}</span> : null}
      </div>
      <div className="mt-3 rounded-md border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            {t('campaigns.availableBalance')}
          </span>
          <span className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
            {formatMoney(available, c.currency)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('campaigns.collectedDistributed', {
            collected: formatMoney(collected, c.currency),
            distributed: formatMoney(distributed, c.currency),
          })}
        </p>
        <div className="mt-2 space-y-1 border-t border-emerald-200/50 pt-2 dark:border-emerald-900/40">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{t('campaigns.reservedAmount')}</span>
            <span className="font-medium tabular-nums text-amber-800 dark:text-amber-200">
              {formatMoney(c.allocatedAmountMinor ?? 0, c.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{t('campaigns.unassignedAmountLabel')}</span>
            <span className="font-medium tabular-nums">
              {formatMoney(c.unassignedAmountMinor ?? 0, c.currency)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Target className="h-3 w-3" />
            {formatMoney(collected, c.currency)} {target > 0 ? `/ ${formatMoney(target, c.currency)}` : ''}
          </span>
          {pct !== null ? <span className="tabular-nums">{pct}%</span> : null}
        </div>
        {pct !== null ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        {c.visibleOnPublicPage ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {c.visibleOnPublicPage ? t('campaigns.public') : t('campaigns.notPublic')}
      </div>
      <div className="mt-3">
        <CampaignBeneficiariesPanel campaign={c} onUpdated={onUpdated} />
      </div>
      <div className="mt-3">
        <CampaignBeneficiaryAllocationsPanel campaignId={c.id} currency={c.currency} onUpdated={onUpdated} />
      </div>
      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowDonations((v) => !v)}>
          {showDonations ? t('campaigns.hideDonations') : t('campaigns.showDonations')}
        </Button>
        {showDonations && (
          <div className="mt-2 rounded border border-border bg-muted/20 p-2">
            {donationsQ.isLoading ? (
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            ) : donationsQ.data && donationsQ.data.items.length > 0 ? (
              <ul className="divide-y text-xs">
                {donationsQ.data.items.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2 py-1.5">
                    <span>
                      {d.isAnonymous
                        ? t('donations.anonymous')
                        : d.donorNameSnapshot ?? t('donations.guest')}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(d.amountMinor, d.currency)} · {formatDate(d.receivedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('campaigns.noDonations')}</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function CampaignBeneficiaryAllocationsPanel({
  campaignId,
  currency,
  onUpdated,
}: {
  campaignId: string;
  currency: string;
  onUpdated: () => void;
}) {
  const t = useTranslations();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [payConfirm, setPayConfirm] = useState<{
    splitId: string;
    amountMinor: number;
    beneficiaryName: string;
  } | null>(null);
  const [cancelPayConfirm, setCancelPayConfirm] = useState<{
    splitId: string;
    amountMinor: number;
    beneficiaryName: string;
  } | null>(null);

  const allocQ = useQuery({
    queryKey: ['campaign-beneficiary-allocations', campaignId],
    queryFn: () => listCampaignBeneficiaryAllocations(campaignId),
    enabled: open,
  });

  const updateMut = useMutation({
    mutationFn: ({ splitId, amountMinor }: { splitId: string; amountMinor: number }) =>
      updateCampaignBeneficiarySplit(campaignId, splitId, amountMinor),
    onSuccess: () => {
      toast.success(t('common.successUpdated'));
      qc.invalidateQueries({ queryKey: ['campaign-beneficiary-allocations', campaignId] });
      onUpdated();
    },
    onError: (err) => {
      const body = (err as ApiError).body as
        | { message?: string | { message?: string; neededMinor?: number }; neededMinor?: number }
        | null;
      const nested =
        body?.message && typeof body.message === 'object' ? body.message : null;
      const neededMinor =
        nested?.neededMinor ?? (typeof body?.neededMinor === 'number' ? body.neededMinor : undefined);
      if (neededMinor != null) {
        toast.error(t('campaigns.needMoreTnd', { amount: formatMoney(neededMinor, currency) }));
        return;
      }
      toast.error((err as Error).message);
    },
  });

  const paidMut = useMutation({
    mutationFn: (splitId: string) => markCampaignBeneficiarySplitPaid(campaignId, splitId),
    onSuccess: () => {
      toast.success(t('campaigns.splitMarkedPaid'));
      setPayConfirm(null);
      qc.invalidateQueries({ queryKey: ['campaign-beneficiary-allocations', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaignId] });
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const cancelPaidMut = useMutation({
    mutationFn: (splitId: string) => unmarkCampaignBeneficiarySplitPaid(campaignId, splitId),
    onSuccess: () => {
      toast.success(t('campaigns.cancelPaidSuccess'));
      setCancelPayConfirm(null);
      qc.invalidateQueries({ queryKey: ['campaign-beneficiary-allocations', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaignId] });
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  function saveSplitAmount(splitId: string) {
    const tnd = editAmounts[splitId];
    if (!tnd || Number(tnd) <= 0) return;
    updateMut.mutate({ splitId, amountMinor: tndToMinor(Number(tnd)) });
  }

  return (
    <div className="rounded border border-border bg-muted/20 p-2">
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen((v) => !v)}>
        <Wallet className="me-1 h-3 w-3" />
        {open ? t('campaigns.hideAllocations') : t('campaigns.beneficiaryAllocations')}
      </Button>
      {open && (
        <div className="mt-2 space-y-3 text-sm">
          {allocQ.isLoading ? (
            <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
          ) : !allocQ.data ? null : (
            <>
              <div className="rounded border border-border bg-background px-2 py-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('campaigns.reservedAmount')}</span>
                  <span className="font-medium tabular-nums text-amber-800 dark:text-amber-200">
                    {formatMoney(allocQ.data.allocatedMinor, currency)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between gap-2">
                  <span className="text-muted-foreground">{t('campaigns.unassignedAmountLabel')}</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(allocQ.data.unassignedMinor, currency)}
                  </span>
                </div>
              </div>
              {!allocQ.data.items.length ? (
                <p className="text-xs text-muted-foreground">{t('campaigns.noAllocations')}</p>
              ) : (
                allocQ.data.items.map((row) => (
                  <BeneficiaryAllocationBlock
                    key={row.beneficiaryId}
                    row={row}
                    currency={currency}
                    editAmounts={editAmounts}
                    setEditAmounts={setEditAmounts}
                    onSaveSplit={saveSplitAmount}
                    onRequestMarkPaid={(split) =>
                      setPayConfirm({
                        splitId: split.id,
                        amountMinor: split.amountMinor,
                        beneficiaryName: row.fullName,
                      })
                    }
                    onRequestCancelPaid={(split) =>
                      setCancelPayConfirm({
                        splitId: split.id,
                        amountMinor: split.amountMinor,
                        beneficiaryName: row.fullName,
                      })
                    }
                    saving={updateMut.isPending}
                    paying={paidMut.isPending || cancelPaidMut.isPending}
                    t={t}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!payConfirm}
        title={t('campaigns.confirmMarkPaidTitle')}
        description={
          payConfirm
            ? t('campaigns.confirmMarkPaidDescription', {
                name: payConfirm.beneficiaryName,
                amount: formatMoney(payConfirm.amountMinor, currency),
              })
            : undefined
        }
        confirmLabel={t('campaigns.markPaid')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => payConfirm && paidMut.mutate(payConfirm.splitId)}
        onCancel={() => setPayConfirm(null)}
        loading={paidMut.isPending}
      />

      <ConfirmDialog
        open={!!cancelPayConfirm}
        title={t('campaigns.confirmCancelPaidTitle')}
        description={
          cancelPayConfirm
            ? t('campaigns.confirmCancelPaidDescription', {
                name: cancelPayConfirm.beneficiaryName,
                amount: formatMoney(cancelPayConfirm.amountMinor, currency),
              })
            : undefined
        }
        confirmLabel={t('campaigns.cancelPaid')}
        cancelLabel={t('common.back')}
        destructive
        alertTone="destructive"
        onConfirm={() => cancelPayConfirm && cancelPaidMut.mutate(cancelPayConfirm.splitId)}
        onCancel={() => setCancelPayConfirm(null)}
        loading={cancelPaidMut.isPending}
      />
    </div>
  );
}

function BeneficiaryAllocationBlock({
  row,
  currency,
  editAmounts,
  setEditAmounts,
  onSaveSplit,
  onRequestMarkPaid,
  onRequestCancelPaid,
  saving,
  paying,
  t,
}: {
  row: CampaignBeneficiaryAllocation;
  currency: string;
  editAmounts: Record<string, string>;
  setEditAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveSplit: (splitId: string) => void;
  onRequestMarkPaid: (split: CampaignBeneficiaryAllocationSplit) => void;
  onRequestCancelPaid: (split: CampaignBeneficiaryAllocationSplit) => void;
  saving: boolean;
  paying: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded border border-border bg-background p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {row.fullName}
            {row.isOrphan ? (
              <span className="ms-1 text-xs text-amber-700 dark:text-amber-300">
                · {t('beneficiaries.orphan')}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{row.code}</p>
        </div>
        <div className="text-xs text-end">
          <p>
            {t('campaigns.allocated')}: {formatMoney(row.allocatedMinor, currency)}
          </p>
          <p className="text-emerald-700 dark:text-emerald-300">
            {t('campaigns.distributed')}: {formatMoney(row.distributedMinor, currency)}
          </p>
          <p className="text-muted-foreground">
            {t('campaigns.pending')}: {formatMoney(row.pendingMinor, currency)}
          </p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
        {row.splits.map((split) => (
          <li key={split.id} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{formatDate(split.receivedAt.slice(0, 10))}</span>
            {split.paidAt ? (
              <>
                <Badge variant="success">{t('campaigns.paid')}</Badge>
                <span className="tabular-nums">{formatMoney(split.amountMinor, split.currency)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2"
                  disabled={paying}
                  onClick={() => onRequestCancelPaid(split)}
                >
                  {t('campaigns.cancelPaid')}
                </Button>
              </>
            ) : (
              <>
                <MoneyInput
                  className="h-9 min-w-[8rem] w-40 text-sm"
                  value={editAmounts[split.id] ?? String(split.amountMinor / 1000)}
                  onValueChange={(v) =>
                    setEditAmounts((prev) => ({ ...prev, [split.id]: String(v) }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={saving}
                  onClick={() => onSaveSplit(split.id)}
                >
                  {t('common.update')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2"
                  disabled={paying}
                  onClick={() => onRequestMarkPaid(split)}
                >
                  {t('campaigns.markPaid')}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CampaignBeneficiariesPanel({
  campaign,
  onUpdated,
}: {
  campaign: CampaignListEntry;
  onUpdated: () => void;
}) {
  const t = useTranslations();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFirst, setQuickFirst] = useState('');
  const [quickLast, setQuickLast] = useState('');
  const [quickOrphan, setQuickOrphan] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const lookupFields = campaign.beneficiaryLookupFields?.length
    ? campaign.beneficiaryLookupFields
    : (['name', 'phone', 'cin'] as BeneficiaryLookupField[]);

  const listQ = useQuery({
    queryKey: ['campaign-beneficiaries', campaign.id],
    queryFn: () => listCampaignBeneficiaries(campaign.id),
    enabled: open,
  });

  const searchQ = useQuery({
    queryKey: ['campaign-ben-search', campaign.id, debouncedSearch],
    queryFn: () =>
      searchBeneficiariesForDonationPick({ q: debouncedSearch, fields: lookupFields }),
    enabled: open && debouncedSearch.length >= 2,
  });

  const linkedIds = new Set((listQ.data?.items ?? []).map((b) => b.beneficiaryId));

  const addMut = useMutation({
    mutationFn: (beneficiaryId: string) => addCampaignBeneficiary(campaign.id, beneficiaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaign.id] });
      setSearch('');
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: (beneficiaryId: string) => removeCampaignBeneficiary(campaign.id, beneficiaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaign.id] });
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const quickMut = useMutation({
    mutationFn: () =>
      quickAddCampaignBeneficiary(campaign.id, {
        firstName: quickFirst.trim(),
        lastName: quickLast.trim(),
        isOrphan: quickOrphan,
      }),
    onSuccess: () => {
      toast.success(t('campaigns.beneficiaryAdded'));
      setQuickFirst('');
      setQuickLast('');
      setQuickOrphan(false);
      qc.invalidateQueries({ queryKey: ['campaign-beneficiaries', campaign.id] });
      onUpdated();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  function pickExisting(hit: BeneficiaryDonationPickHit) {
    if (linkedIds.has(hit.id)) {
      toast.error(t('campaigns.beneficiaryAlreadyLinked'));
      return;
    }
    addMut.mutate(hit.id);
  }

  return (
    <div className="rounded border border-border bg-muted/20 p-2">
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen((v) => !v)}>
        <Users className="me-1 h-3 w-3" />
        {open ? t('campaigns.hideBeneficiaries') : t('campaigns.manageBeneficiaries')}
      </Button>
      {open && (
        <div className="mt-2 space-y-3 text-sm">
          {listQ.isLoading ? (
            <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
          ) : listQ.data && listQ.data.items.length > 0 ? (
            <ul className="divide-y rounded border border-border bg-background">
              {listQ.data.items.map((b) => (
                <li
                  key={b.linkId}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 ${
                    !b.hasReceivedPayment
                      ? 'bg-amber-50/90 dark:bg-amber-950/35'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.code}
                      {b.isOrphan ? ` · ${t('beneficiaries.orphan')}` : ''}
                      {!b.hasReceivedPayment ? (
                        <span className="ms-1 text-amber-800 dark:text-amber-200">
                          · {t('campaigns.noPaymentYet')}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2"
                    disabled={removeMut.isPending}
                    onClick={() => removeMut.mutate(b.beneficiaryId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t('campaigns.noBeneficiaries')}</p>
          )}

          <div className="space-y-2 rounded border border-dashed border-border p-2">
            <Label className="text-xs">{t('campaigns.addExistingBeneficiary')}</Label>
            <Input
              placeholder={t('donations.searchBeneficiaryPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {debouncedSearch.length >= 2 ? (
              <ul className="max-h-32 overflow-y-auto rounded border">
                {(searchQ.data?.items ?? [])
                  .filter((hit) => !linkedIds.has(hit.id))
                  .map((hit) => (
                    <BeneficiaryDonationPickRow
                      key={hit.id}
                      hit={hit}
                      onPick={() => pickExisting(hit)}
                    />
                  ))}
              </ul>
            ) : null}
          </div>

          <form
            className="space-y-2 rounded border border-dashed border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickFirst.trim() || !quickLast.trim()) return;
              quickMut.mutate();
            }}
          >
            <Label className="text-xs">{t('campaigns.quickAddBeneficiary')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t('beneficiaries.firstName')}
                value={quickFirst}
                onChange={(e) => setQuickFirst(e.target.value)}
              />
              <Input
                placeholder={t('beneficiaries.lastName')}
                value={quickLast}
                onChange={(e) => setQuickLast(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={quickOrphan}
                onChange={(e) => setQuickOrphan(e.target.checked)}
              />
              {t('beneficiaries.orphan')}
            </label>
            <Button type="submit" size="sm" disabled={quickMut.isPending || !quickFirst.trim() || !quickLast.trim()}>
              {t('campaigns.quickAddBeneficiaryBtn')}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatCampaignEnd(endsAt: string | null, t: (k: string) => string): string {
  if (!endsAt) return t('campaigns.openEnded');
  return formatDate(endsAt);
}
