'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Building2, Calendar, Coins, Gift, HandCoins, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listMyDonations, type MyDonation } from '@/lib/api/donor';

export default function MyDonationsPage() {
  const t = useTranslations();
  const q = useQuery({ queryKey: ['me', 'donations'], queryFn: listMyDonations });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('donor.myDonationsTitle')}</h1>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<Heart className="h-4 w-4" />}
          label={t('donor.totalGiven')}
          value={
            q.data && q.data.totalGiven.length > 0
              ? q.data.totalGiven
                  .map((g) => formatMoney(g.amountMinor, g.currency))
                  .join(' / ')
              : '—'
          }
          loading={q.isLoading}
        />
        <SummaryCard
          icon={<HandCoins className="h-4 w-4" />}
          label="Donations"
          value={q.data ? String(q.data.total) : '—'}
          loading={q.isLoading}
        />
        <SummaryCard
          icon={<Building2 className="h-4 w-4" />}
          label="Associations"
          value={
            q.data
              ? String(new Set(q.data.items.map((d) => d.organizationId)).size)
              : '—'
          }
          loading={q.isLoading}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('donor.myDonationsTitle')}</CardTitle>
          <CardDescription>{t('donor.receiptDownload')}</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : q.data && q.data.items.length > 0 ? (
            <ul className="divide-y divide-border">
              {q.data.items.map((d) => (
                <DonationRow key={d.id} d={d} t={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('donor.noDonations')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DonationRow({ d, t }: { d: MyDonation; t: (k: string) => string }) {
  const isInKind = d.kind === 'in_kind';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          {isInKind ? <Gift className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {d.organization.legalName}
            {d.isAnonymous ? (
              <Badge variant="muted">{t('donor.anonymous')}</Badge>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDateTime(d.receivedAt)}</span>
            <Badge variant="default">{safeT(t, `donations.kind${capitalize(d.kind)}`, d.kind)}</Badge>
          </div>
        </div>
      </div>
      <div className="text-end">
        {isInKind ? (
          <div className="text-sm font-semibold">
            {d.inKindQuantity} {d.inKindUnit}
            {d.inKindEstValueMinor != null ? (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                ≈ {formatMoney(d.inKindEstValueMinor, d.currency)}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="text-base font-semibold tabular-nums">
            {formatMoney(d.amountMinor, d.currency)}
          </div>
        )}
      </div>
    </li>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{loading ? '…' : value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMoney(minor: number, currency: string): string {
  const amount = minor / 1000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${currency}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_(.)/g, (_, c) => c.toUpperCase());
}

function safeT(t: (k: string) => string, key: string, fallback: string): string {
  try {
    const v = t(key);
    return v === key ? fallback : v;
  } catch {
    return fallback;
  }
}
