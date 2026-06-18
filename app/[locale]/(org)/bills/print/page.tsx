'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { getBill } from '@/lib/api/bills';
import { BillReceiptView } from '@/components/bill-receipt-view';

export default function BillPrintPage() {
  const t = useTranslations();
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const autoprint = params.get('autoprint') !== '0';

  const q = useQuery({
    queryKey: ['bill', id],
    queryFn: () => getBill(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (autoprint && q.data) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [autoprint, q.data]);

  if (!id) return <p className="p-8 text-sm">{t('bills.missingId')}</p>;
  if (q.isLoading) return <p className="p-8 text-sm">{t('common.loading')}</p>;
  if (!q.data) return <p className="p-8 text-sm">{t('common.error')}</p>;

  return (
    <div className="mx-auto max-w-md p-8 text-black print:p-4">
      <BillReceiptView bill={q.data} forPrint />
    </div>
  );
}
