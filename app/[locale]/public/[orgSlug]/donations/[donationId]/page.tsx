import type { ReactNode } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  Building2,
  Calendar,
  CircleDollarSign,
  Globe,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  publicDonationVerification,
  publicOrganizationLogoUrl,
  type PublicDonationVerification,
} from '@/lib/api/tenancy';

function formatMoney(minor: number, currency: string): string {
  const amount = minor / 1000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${currency}`;
}

function kindKey(kind: string): string {
  const map: Record<string, string> = {
    cash: 'donations.kindCash',
    card: 'donations.kindCard',
    bank_transfer: 'donations.kindBankTransfer',
    gateway: 'donations.kindGateway',
    in_kind: 'donations.kindInKind',
  };
  return map[kind] ?? 'donations.kindCash';
}

export default async function PublicDonationVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string; donationId: string }>;
}) {
  const { locale, orgSlug, donationId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  let data: PublicDonationVerification;
  try {
    data = await publicDonationVerification(orgSlug, donationId);
  } catch {
    notFound();
  }

  const org = data.organization;
  const logoSrc = org.hasLogo ? publicOrganizationLogoUrl(org.slug) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-background to-background">
      <div className="mx-auto max-w-lg space-y-6 p-6 pb-12">
        <header className="flex items-center justify-center gap-2 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium tracking-wide">{t('app.name')}</span>
        </header>

        <Card className="overflow-hidden border-emerald-200/60 shadow-lg shadow-emerald-900/5">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <BadgeCheck className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t('public.donationVerify.title')}</h1>
            <p className="mt-2 text-sm text-emerald-50/90">{t('public.donationVerify.subtitle')}</p>
          </div>

          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col items-center text-center">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className="mb-4 h-20 w-20 rounded-xl border border-border/60 bg-white object-contain p-2 shadow-sm"
                />
              ) : (
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <h2 className="text-xl font-bold text-emerald-800">{org.legalName}</h2>
              {org.fiscalId ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('bills.fiscalId')}: {org.fiscalId}
                </p>
              ) : null}
            </div>

            {(org.address || org.phone || org.website) && (
              <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
                {org.address ? (
                  <p className="flex gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{org.address}</span>
                  </p>
                ) : null}
                {org.phone ? (
                  <p className="mt-2 flex gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-emerald-700" />
                    <a href={`tel:${org.phone}`} className="hover:text-foreground hover:underline">
                      {org.phone}
                    </a>
                  </p>
                ) : null}
                {org.website ? (
                  <p className="mt-2 flex gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4 shrink-0 text-emerald-700" />
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all hover:text-foreground hover:underline"
                    >
                      {org.website}
                    </a>
                  </p>
                ) : null}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailTile
                icon={<CircleDollarSign className="h-4 w-4" />}
                label={t('donations.amount')}
                value={formatMoney(data.donation.amountMinor, data.donation.currency)}
                highlight
              />
              <DetailTile
                icon={<Calendar className="h-4 w-4" />}
                label={t('donations.receivedAt')}
                value={formatDate(data.donation.receivedAt)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="success">
                {t(kindKey(data.donation.kind))}
              </Badge>
              <Badge variant="muted" className="font-mono text-xs">
                {data.receipt.number}
              </Badge>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t('public.donationVerify.issuedOn', {
                date: formatDateTime(data.receipt.issuedAt),
              })}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">{t('public.donationVerify.footer')}</p>
      </div>
    </main>
  );
}

function DetailTile({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1 ${highlight ? 'text-2xl font-bold tabular-nums text-emerald-800' : 'font-medium'}`}>
        {value}
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
