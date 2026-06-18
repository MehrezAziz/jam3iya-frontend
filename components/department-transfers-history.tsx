'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { listDepartmentTransfers } from '@/lib/api/treasury';
import { formatTndMinor } from '@/lib/utils';

export function DepartmentTransfersHistory({ limit = 200 }: { limit?: number }) {
  const t = useTranslations();
  const transfersQ = useQuery({
    queryKey: ['treasury-transfers', limit],
    queryFn: () => listDepartmentTransfers(limit),
  });

  if (transfersQ.isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (!transfersQ.data || transfersQ.data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('treasury.historyEmpty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <colgroup>
          <col className="w-44" />
          <col className="w-40" />
          <col className="w-40" />
          <col className="w-28" />
          <col />
        </colgroup>
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-start font-medium">{t('treasury.colDate')}</th>
            <th className="px-4 py-2 text-start font-medium">{t('treasury.colFrom')}</th>
            <th className="px-4 py-2 text-start font-medium">{t('treasury.colTo')}</th>
            <th className="px-4 py-2 text-end font-medium">{t('treasury.colAmount')}</th>
            <th className="px-4 py-2 text-start font-medium">{t('treasury.colNotes')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transfersQ.data.map((tr) => (
            <tr key={tr.id} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-2 align-top text-muted-foreground">
                {new Date(tr.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 align-top font-medium">{tr.fromDepartmentName}</td>
              <td className="px-4 py-2 align-top font-medium">{tr.toDepartmentName}</td>
              <td className="px-4 py-2 align-top text-end font-semibold tabular-nums">
                {formatTndMinor(tr.amountMinor)}
              </td>
              <td className="px-4 py-2 align-top text-muted-foreground">
                <span className="line-clamp-2 break-words">{tr.notes ?? '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
