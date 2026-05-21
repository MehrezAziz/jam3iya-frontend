import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Calendar, Megaphone, ShieldCheck, Sparkles, Target, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { publicOrgStats, type PublicCampaign, type PublicStats } from '@/lib/api/tenancy';

export default async function TransparencyPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>;
}) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  let data: PublicStats;
  try {
    data = await publicOrgStats(orgSlug);
  } catch {
    notFound();
  }

  const org = data.organization;
  const activeCampaigns = data.campaigns.filter((c) => c.state === 'active');
  const closedCampaigns = data.campaigns.filter((c) => c.state === 'closed');

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="border-b border-border pb-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">{t('app.name')}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{org.legalName}</h1>
        <p className="text-sm text-muted-foreground">
          {t('public.subtitle', { year: data.year })}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Wallet className="h-4 w-4" />}
          label={t('public.fundsCollected')}
          value={formatMoney(data.totals.donationsAmountMinor, org.defaultCurrency)}
          sub={`${data.totals.donationsCount} ${t('public.donations')}`}
        />
        <Metric
          icon={<Target className="h-4 w-4" />}
          label={t('public.distributions')}
          value={String(data.totals.distributionsCount)}
          sub={t('public.distributionsSub')}
        />
        <Metric
          icon={<Users className="h-4 w-4" />}
          label={t('public.activeBeneficiaries')}
          value={String(data.totals.activeBeneficiaries)}
          sub={t('public.activeBeneficiariesSub')}
        />
        <Metric
          icon={<Sparkles className="h-4 w-4" />}
          label={t('public.transparencyCommit')}
          value={`${data.year}`}
          sub={t('public.transparencyCommitSub')}
        />
      </section>

      {activeCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {t('public.activeCampaigns')}
            </CardTitle>
            <CardDescription>{t('public.activeCampaignsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeCampaigns.map((c) => (
              <CampaignCard key={c.id} c={c} t={t} />
            ))}
          </CardContent>
        </Card>
      )}

      {closedCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              {t('public.closedCampaigns')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {closedCampaigns.map((c) => (
              <CampaignCard key={c.id} c={c} t={t} />
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{t('public.footer')}</p>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function CampaignCard({ c, t }: { c: PublicCampaign; t: (k: string) => string }) {
  const target = c.targetAmountMinor ?? 0;
  const collected = c.collectedAmountMinor;
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : null;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{c.name}</h3>
        <Badge variant={c.state === 'active' ? 'success' : 'muted'}>
          {t(`campaigns.state_${c.state}`)}
        </Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <Calendar className="me-1 inline h-3 w-3" />
        {formatDate(c.startsAt)} → {c.endsAt ? formatDate(c.endsAt) : t('campaigns.openEnded')}
      </div>
      {c.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
      ) : null}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
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
    </div>
  );
}

function formatMoney(minor: number, currency: string): string {
  const amount = minor / 1000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${currency}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
