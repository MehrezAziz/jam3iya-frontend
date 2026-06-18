'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useLocale, useTranslations } from 'next-intl';
import { organizationLogoUrl } from '@/lib/api/tenancy';
import { formatTndMinor } from '@/lib/utils';
import type { BillItem, BillPrintDonation } from '@/lib/api/bills';

function kindLabel(kind: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    cash: t('donations.kindCash'),
    card: t('donations.kindCard'),
    bank_transfer: t('donations.kindBankTransfer'),
    gateway: t('donations.kindGateway'),
    in_kind: t('donations.kindInKind'),
  };
  return map[kind] ?? kind;
}

function donationVerifyUrl(origin: string, locale: string, orgSlug: string, donationId: string): string {
  return `${origin}/${locale}/public/${encodeURIComponent(orgSlug)}/donations/${encodeURIComponent(donationId)}`;
}

export type BillReceiptData = BillItem & {
  organization: {
    legalName: string;
    slug: string;
    fiscalId: string | null;
    address: string | null;
    phone: string | null;
    logoFileId: string | null;
  };
  linkedDonation: BillPrintDonation | null;
};

interface BillReceiptViewProps {
  bill: BillReceiptData;
  /** When true, shows print-only header row (date + app name). */
  forPrint?: boolean;
}

export function BillReceiptView({ bill, forPrint }: BillReceiptViewProps) {
  const t = useTranslations();
  const locale = useLocale();
  const donation = bill.linkedDonation;
  const recipient = donation?.isAnonymous
    ? t('donations.anonymous')
    : ((bill.recipientSnapshot?.name as string | undefined) ?? donation?.donorNameSnapshot ?? '—');

  const logoSrc = bill.organization.logoFileId ? organizationLogoUrl() : null;
  const printDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const verifyUrl = useMemo(() => {
    if (!donation?.id || !bill.organization.slug) return null;
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_WEB_URL ?? '');
    if (!origin) return null;
    return donationVerifyUrl(origin, locale, bill.organization.slug, donation.id);
  }, [bill.organization.slug, donation?.id, locale]);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!verifyUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  return (
    <div className={`mx-auto max-w-md text-black ${forPrint ? 'p-4 print:p-4' : 'p-2'}`}>
      {forPrint ? (
        <div className="mb-4 hidden items-start justify-between text-sm print:flex">
          <span className="text-gray-700">{printDate}</span>
          <span className="font-bold text-emerald-700">{t('app.name')}</span>
        </div>
      ) : null}
      <header className="text-center">
        <h1 className="text-xl font-bold text-emerald-700">{bill.organization.legalName}</h1>
        {bill.organization.fiscalId ? (
          <p className="mt-1 text-sm text-gray-800">
            {t('bills.fiscalId')}: {bill.organization.fiscalId}
          </p>
        ) : null}
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="mx-auto mt-4 h-24 w-24 object-contain" />
        ) : null}
      </header>

      <hr className="my-5 border-gray-300" />

      <div className="flex w-full justify-center">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" width={160} height={160} className="mx-auto block rounded" />
        ) : (
          <div className="mx-auto h-40 w-40 animate-pulse rounded bg-gray-100" />
        )}
      </div>

      <section className="mt-6 space-y-2 text-sm">
        <Row label={t('bills.recipient')} value={recipient} />
        {donation?.id ? <Row label={t('donations.donationId')} value={donation.id} mono /> : null}
        <Row
          label={t('bills.issuedAt')}
          value={new Date(bill.issuedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        />
        <Row label={t('donations.amount')} value={formatTndMinor(bill.totalMinor)} bold />
        {donation?.kind ? <Row label={t('donations.kind')} value={kindLabel(donation.kind, t)} /> : null}
        {donation?.spendCategory ? (
          <Row label={t('donations.category')} value={donation.spendCategory.replace(/_/g, ' ')} />
        ) : null}
        {donation?.campaignName ? <Row label={t('donations.campaign')} value={donation.campaignName} /> : null}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <p className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
      <span className="font-medium text-gray-700">{label}</span>
      <span className={bold ? 'text-lg font-bold' : mono ? 'break-all font-mono text-xs' : ''}>{value}</span>
    </p>
  );
}
