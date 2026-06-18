'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DepartmentTransferForm } from '@/components/department-transfer-form';
import { DepartmentTransfersHistory } from '@/components/department-transfers-history';
import { canManageTransfers } from '@/lib/api/treasury';

export default function TransfersPage() {
  const t = useTranslations();
  const canQ = useQuery({ queryKey: ['treasury-can-transfer'], queryFn: canManageTransfers });

  const canCreate = canQ.data?.allowed === true;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          {t('nav.transfers')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('treasury.pageSubtitle')}</p>
      </header>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('treasury.newTransfer')}</CardTitle>
            <CardDescription>{t('treasury.transfersHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentTransferForm />
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t('treasury.viewOnlyHint')}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('treasury.historyTitle')}</CardTitle>
          <CardDescription>{t('treasury.historyHint')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <DepartmentTransfersHistory limit={200} />
        </CardContent>
      </Card>
    </div>
  );
}
