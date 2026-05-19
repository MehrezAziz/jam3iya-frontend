'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getBill } from '@/lib/api/bills';
import { formatTndMinor } from '@/lib/utils';

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

export default function BillPrintPage() {
  const t = useTranslations();
  const params = useSearchParams();
  const id = params.get('id') ?? '';

  const q = useQuery({
    queryKey: ['bill', id],
    queryFn: () => getBill(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (q.data) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [q.data]);

  if (!id) return <p className="p-8 text-sm">{t('bills.missingId')}</p>;
  if (q.isLoading) return <p className="p-8 text-sm">{t('common.loading')}</p>;
  if (!q.data) return <p className="p-8 text-sm">{t('common.error')}</p>;

  const b = q.data;
  const donation = b.linkedDonation;
  const recipient = donation?.isAnonymous
    ? t('donations.anonymous')
    : ((b.recipientSnapshot?.name as string | undefined) ?? donation?.donorNameSnapshot ?? '—');
  const billRef = `${b.series}-${b.yearIssued}-${b.number}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(b.id)}`;

  return (
    <div className="mx-auto max-w-md p-8 text-black print:p-4">
      <header className="border-b border-gray-300 pb-4 text-center">
        <h1 className="text-xl font-bold">{b.organization.legalName}</h1>
        {b.organization.fiscalId ? (
          <p className="text-sm text-gray-700">
            {t('bills.fiscalId')}: {b.organization.fiscalId}
          </p>
        ) : null}
        <p className="mt-2 text-base font-semibold">{t('bills.receiptTitle')}</p>
        <p className="font-mono text-sm">{billRef}</p>
      </header>

      <div className="mt-4 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="" width={120} height={120} className="rounded" />
      </div>
      <p className="text-center font-mono text-xs text-gray-600">{b.id}</p>

      <section className="mt-6 space-y-2 text-sm">
        <Row label={t('bills.recipient')} value={recipient} />
        <Row
          label={t('bills.issuedAt')}
          value={new Date(b.issuedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        />
        <Row label={t('donations.amount')} value={formatTndMinor(b.totalMinor)} bold />
        {donation?.kind ? (
          <Row label={t('donations.kind')} value={kindLabel(donation.kind, t)} />
        ) : null}
        {donation?.spendCategory ? (
          <Row label={t('donations.category')} value={donation.spendCategory.replace(/_/g, ' ')} />
        ) : null}
        {donation?.campaignName ? (
          <Row label={t('donations.campaign')} value={donation.campaignName} />
        ) : null}
        {donation?.id ? (
          <Row label={t('donations.donationId')} value={donation.id} mono />
        ) : null}
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
      <span className={bold ? 'text-lg font-bold' : mono ? 'font-mono text-xs break-all' : ''}>{value}</span>
    </p>
  );
}
