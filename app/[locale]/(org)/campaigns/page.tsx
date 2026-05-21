'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Calendar, Eye, EyeOff, Megaphone, Pencil, Plus, Sparkles, Target, Wallet } from 'lucide-react';
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
import { MoneyInput } from '@/components/ui/money-input';
import { DateInput } from '@/components/ui/date-input';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  listCampaignDonations,
  listOccasions,
  createOccasion,
  type CampaignListEntry,
} from '@/lib/api/campaigns';
import { tndToMinor, formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

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
                <CampaignCard key={c.id} c={c} t={t} onUpdated={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />
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
  t,
  onUpdated,
}: {
  c: CampaignListEntry;
  t: (k: string) => string;
  onUpdated: () => void;
}) {
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
  const saveMut = useMutation({
    mutationFn: () =>
      updateCampaign(c.id, {
        startsAt,
        endsAt: noEndDate ? null : endsAt,
        targetAmountMinor: targetTnd ? tndToMinor(Number(targetTnd)) : null,
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatCampaignEnd(endsAt: string | null, t: (k: string) => string): string {
  if (!endsAt) return t('campaigns.openEnded');
  return formatDate(endsAt);
}
