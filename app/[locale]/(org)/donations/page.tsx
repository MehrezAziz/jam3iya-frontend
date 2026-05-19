'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { listDonations, type DonationItem } from '@/lib/api/donations';
import { issueDonationReceipt } from '@/lib/api/bills';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { listCampaigns } from '@/lib/api/campaigns';
import { formatTndMinor, formatGregorianAndHijri } from '@/lib/utils';
import { CopyableId } from '@/components/copyable-id';
import { useLocale } from 'next-intl';

const DONATION_CATEGORIES = [
  'food',
  'medicine',
  'clothing',
  'school_supplies',
  'hygiene',
  'blankets',
  'furniture',
];

export default function DonationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [kind, setKind] = useState('');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const campaignsQ = useQuery({ queryKey: ['campaigns'], queryFn: listCampaigns });

  const { data, isLoading } = useQuery({
    queryKey: ['donations', { kind, selectedCampaigns, selectedCategories, from, to }],
    queryFn: () =>
      listDonations({
        limit: 100,
        kind: kind ? (kind as DonationItem['kind']) : undefined,
        campaignIds: selectedCampaigns.length ? selectedCampaigns : undefined,
        spendCategories: selectedCategories.length ? selectedCategories : undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  function toggleCampaign(id: string) {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat],
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('donations.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/donations/add-donor">{t('donations.addDonator')}</Link>
          </Button>
          <Button asChild>
            <Link href="/donations/new-cash">{t('donations.newCash')}</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{t('donations.filterKind')}</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">{t('donations.filterAll')}</option>
                <option value="cash">cash</option>
                <option value="in_kind">in_kind</option>
              </Select>
            </div>
            <div>
              <Label>{t('donations.filterFrom')}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>{t('donations.filterTo')}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t('donations.filterCategories')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DONATION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedCategories.includes(cat)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('donations.filterCampaigns')}</Label>
            <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {(campaignsQ.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCampaign(c.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedCampaigns.includes(c.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">—</div>
          ) : (
            <ul className="divide-y divide-border">
              {data.items.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CopyableId id={d.id} label={t('donations.donationId')} />
                      <div className="font-medium">
                        {d.isAnonymous ? t('donations.anonymous') : d.donorNameSnapshot ?? d.donorId ?? '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatGregorianAndHijri(d.receivedAt, locale)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="muted">{d.kind}</Badge>
                        {d.spendCategory ? (
                          <Badge variant="muted">{d.spendCategory.replace(/_/g, ' ')}</Badge>
                        ) : null}
                        {d.campaignName ? <Badge variant="default">{d.campaignName}</Badge> : null}
                      </div>
                      {d.notes ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{t('donations.notes')}:</span> {d.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {d.kind === 'cash' ? <DonationPrintButton donation={d} t={t} /> : null}
                      <span className="font-semibold tabular-nums">{formatTndMinor(d.amountMinor)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DonationPrintButton({
  donation,
  t,
}: {
  donation: DonationItem;
  t: (k: string) => string;
}) {
  const issueMut = useMutation({
    mutationFn: async () => {
      if (donation.receiptBill) return donation.receiptBill;
      const name = donation.isAnonymous
        ? t('donations.anonymous')
        : donation.donorNameSnapshot ?? t('donations.unknownDonor');
      const res = await issueDonationReceipt({
        donationId: donation.id,
        recipientName: name,
        isTaxReceipt: true,
      });
      return { id: res.id, number: res.number, series: 'RECEIPT', yearIssued: new Date().getFullYear() };
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handlePrint() {
    try {
      const bill = await issueMut.mutateAsync();
      window.open(`/bills/print?id=${bill.id}`, '_blank', 'noopener');
    } catch {
      /* handled */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8"
      onClick={handlePrint}
      disabled={issueMut.isPending}
      title={t('donations.printReceipt')}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
