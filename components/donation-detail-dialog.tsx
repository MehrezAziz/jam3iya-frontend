'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { getDonation } from '@/lib/api/donations';
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/money';
import { formatGregorianAndHijri } from '@/lib/utils';

interface DonationDetailDialogProps {
  donationId: string | null;
  onClose: () => void;
}

export function DonationDetailDialog({ donationId, onClose }: DonationDetailDialogProps) {
  const t = useTranslations();
  const locale = useLocale();

  const q = useQuery({
    queryKey: ['donation', donationId],
    queryFn: () => getDonation(donationId!),
    enabled: !!donationId,
  });

  const d = q.data;

  return (
    <ConfirmDialog
      open={!!donationId}
      title={t('donations.detailTitle')}
      description={
        q.isLoading ? (
          <p className="py-6 text-center text-sm">{t('common.loading')}</p>
        ) : !d ? (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        ) : (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto text-sm">
            <Row label={t('donations.donationId')} value={d.id} mono />
            <Row
              label={t('donations.date')}
              value={formatGregorianAndHijri(d.receivedAt.slice(0, 10), locale)}
            />
            <Row label={t('donations.kind')} value={kindLabel(d.kind, t)} />
            <Row
              label={t('donations.donor')}
              value={
                d.isAnonymous
                  ? t('donations.anonymous')
                  : d.donorDisplayName ?? d.donorNameSnapshot ?? t('donations.guest')
              }
            />
            {d.amountMinor > 0 ? (
              <Row label={t('donations.amount')} value={formatMoney(d.amountMinor, d.currency)} bold />
            ) : null}
            {d.campaignName ? <Row label={t('donations.campaign')} value={d.campaignName} /> : null}
            {d.spendCategory ? (
              <Row label={t('donations.category')} value={d.spendCategory.replace(/_/g, ' ')} />
            ) : null}
            {d.departmentName ? <Row label={t('donations.department')} value={d.departmentName} /> : null}
            {d.notes ? <Row label={t('donations.notes')} value={d.notes} /> : null}

            {d.inKindItem ? (
              <section className="rounded border border-border p-2">
                <p className="mb-1 font-medium">{t('donations.inKindReceived')}</p>
                <p>
                  {d.inKindItem.name}: {d.inKindItem.quantity} {d.inKindItem.unit}
                  {d.inKindItem.estimatedValueMinor
                    ? ` · ${formatMoney(d.inKindItem.estimatedValueMinor, d.currency)}`
                    : ''}
                </p>
              </section>
            ) : null}

            {d.beneficiarySplits.length > 0 ? (
              <section className="rounded border border-border p-2">
                <p className="mb-2 font-medium">{t('donations.cashSplits')}</p>
                <ul className="space-y-1">
                  {d.beneficiarySplits.map((s) => (
                    <li key={s.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {s.beneficiaryName}{' '}
                        <span className="text-muted-foreground">({s.beneficiaryCode})</span>
                      </span>
                      <span className="tabular-nums">{formatMoney(s.amountMinor, s.currency)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {d.itemGrants.length > 0 ? (
              <section className="rounded border border-border p-2">
                <p className="mb-2 font-medium">{t('donations.itemGrants')}</p>
                <ul className="space-y-1">
                  {d.itemGrants.map((g) => (
                    <li key={g.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {g.itemName} × {g.quantity} {g.unit} → {g.beneficiaryName}
                      </span>
                      <Badge variant="muted">{g.beneficiaryCode}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )
      }
      confirmLabel={t('common.close')}
      cancelLabel={t('common.back')}
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
}

function kindLabel(kind: string, t: ReturnType<typeof useTranslations>): string {
  const map: Record<string, string> = {
    cash: t('donations.kindCash'),
    card: t('donations.kindCard'),
    bank_transfer: t('donations.kindBankTransfer'),
    gateway: t('donations.kindGateway'),
    in_kind: t('donations.kindInKind'),
  };
  return map[kind] ?? kind;
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
    <p className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold tabular-nums' : mono ? 'font-mono text-xs break-all' : ''}>
        {value}
      </span>
    </p>
  );
}
