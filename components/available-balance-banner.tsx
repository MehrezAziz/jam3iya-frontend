'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { donationStats } from '@/lib/api/donations';
import { formatTndMinor } from '@/lib/utils';

/** Shows the current user's department available treasury balance. */
export function AvailableBalanceBanner() {
  const t = useTranslations();
  const { data, isLoading } = useQuery({
    queryKey: ['donation-stats'],
    queryFn: () => donationStats(),
  });

  if (isLoading || !data) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{t('dashboard.availableBalance')}: </span>
      <span className="font-semibold tabular-nums text-primary">
        {formatTndMinor(data.availableBalanceMinor)}
      </span>
      {data.scopeDepartmentName ? (
        <span className="ms-2 text-muted-foreground">({data.scopeDepartmentName})</span>
      ) : null}
    </div>
  );
}
