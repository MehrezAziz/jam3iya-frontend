'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { BillReceiptView } from '@/components/bill-receipt-view';
import { getBill } from '@/lib/api/bills';

interface ReceiptPreviewDialogProps {
  billId: string | null;
  onClose: () => void;
}

export function ReceiptPreviewDialog({ billId, onClose }: ReceiptPreviewDialogProps) {
  const t = useTranslations();

  const q = useQuery({
    queryKey: ['bill-preview', billId],
    queryFn: () => getBill(billId!),
    enabled: !!billId,
  });

  function handlePrint() {
    if (!billId || !q.data) return;
    window.open(`/bills/print?id=${encodeURIComponent(billId)}&autoprint=1`, '_blank', 'noopener');
    onClose();
  }

  return (
    <ConfirmDialog
      open={!!billId}
      title={t('bills.previewTitle')}
      description={
        q.isLoading ? (
          <p className="py-8 text-center text-sm">{t('common.loading')}</p>
        ) : q.data ? (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border bg-white p-2 text-black">
            <BillReceiptView bill={q.data} />
          </div>
        ) : (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        )
      }
      confirmLabel={t('bills.print')}
      cancelLabel={t('common.cancel')}
      onConfirm={handlePrint}
      onCancel={onClose}
      loading={q.isLoading}
    />
  );
}
