'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Building2, Calendar, FileText, Hash } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listMyReceipts, type MyReceipt } from '@/lib/api/donor';

export default function MyReceiptsPage() {
  const t = useTranslations();
  const q = useQuery<MyReceipt[]>({ queryKey: ['me', 'receipts'], queryFn: listMyReceipts });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('donor.receiptsTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('donor.receiptDownload')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('donor.receiptsTitle')}
          </CardTitle>
          <CardDescription>{t('donor.receiptDownload')}</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : q.data && q.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {q.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <code className="font-mono">{r.number}</code>
                        {r.isTaxReceipt ? <Badge variant="success">tax</Badge> : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{r.organization.legalName}</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(r.issuedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end text-base font-semibold tabular-nums">
                      {formatMoney(r.totalMinor, r.currency)}
                    </div>
                    <Button variant="outline" size="sm" disabled={!r.pdfFileId}>
                      PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('donor.noReceipts')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMoney(minor: number, currency: string): string {
  const amount = minor / 1000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${currency}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
