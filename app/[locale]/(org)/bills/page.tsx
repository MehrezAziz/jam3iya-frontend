'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { listBills, issueDonationReceipt, type BillItem } from '@/lib/api/bills';
import { formatTndMinor, formatGregorianAndHijri } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { Receipt } from 'lucide-react';

export default function BillsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const qc = useQueryClient();
  const [donationId, setDonationId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientFiscalId, setRecipientFiscalId] = useState('');

  const billsQ = useQuery({
    queryKey: ['bills'],
    queryFn: () => listBills({ limit: 100 }),
  });

  const issueMut = useMutation({
    mutationFn: () =>
      issueDonationReceipt({
        donationId: donationId.trim(),
        recipientName: recipientName.trim(),
        recipientFiscalId: recipientFiscalId.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.alreadyExists ? t('bills.alreadyIssued') : t('bills.issued', { number: res.number }));
      qc.invalidateQueries({ queryKey: ['bills'] });
      setDonationId('');
      setRecipientName('');
      setRecipientFiscalId('');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.bills')}</h1>
        <p className="text-sm text-muted-foreground">{t('bills.subtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            {t('bills.issueTitle')}
          </CardTitle>
          <CardDescription>{t('bills.issueHint')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t('bills.donationId')}</Label>
            <Input
              value={donationId}
              onChange={(e) => setDonationId(e.target.value)}
              placeholder="uuid"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>{t('bills.recipientName')}</Label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div>
            <Label>{t('bills.recipientFiscalId')}</Label>
            <Input value={recipientFiscalId} onChange={(e) => setRecipientFiscalId(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={() => issueMut.mutate()}
              disabled={issueMut.isPending || !donationId || !recipientName}
            >
              {t('bills.issueButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('bills.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {billsQ.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !billsQ.data?.items.length ? (
            <p className="p-6 text-sm text-muted-foreground">{t('bills.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {billsQ.data.items.map((b: BillItem) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-mono font-medium">{b.number}</div>
                    <div className="text-sm text-muted-foreground">
                      {(b.recipientSnapshot as { name?: string })?.name ?? '—'} ·{' '}
                      {formatGregorianAndHijri(b.issuedAt, locale)}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <Badge variant={b.status === 'issued' ? 'success' : 'muted'}>{b.status}</Badge>
                      {b.isTaxReceipt ? <Badge variant="default">{t('bills.taxReceipt')}</Badge> : null}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatTndMinor(b.totalMinor)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
