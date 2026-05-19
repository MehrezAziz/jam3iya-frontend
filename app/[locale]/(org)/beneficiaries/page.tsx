'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listBeneficiaries, type BeneficiaryStatus } from '@/lib/api/beneficiaries';
import type { ListResponse, BeneficiarySummaryItem } from '@/lib/api/beneficiaries';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useState } from 'react';
import { FileText, Search } from 'lucide-react';

const STATUS_VARIANT: Record<BeneficiaryStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  draft: 'muted',
  pending_review: 'warning',
  active: 'success',
  on_hold: 'warning',
  archived: 'muted',
};

export default function BeneficiariesPage() {
  const t = useTranslations();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 350);

  const { data, isLoading, isFetching } = useQuery<ListResponse<BeneficiarySummaryItem>>({
    queryKey: ['beneficiaries', debouncedQ],
    queryFn: () => listBeneficiaries({ q: debouncedQ || undefined, limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('beneficiaries.title')}</h1>
        <Button asChild>
          <Link href="/beneficiaries/new">{t('beneficiaries.newButton')}</Link>
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('beneficiaries.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ps-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('beneficiaries.searchHint')}</p>

      <Card>
        <CardContent className="p-0">
          {isLoading || isFetching ? (
            <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">{t('beneficiaries.noResults')}</div>
          ) : (
            <ul className="divide-y divide-border">
              {data.items.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/beneficiaries/${b.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{b.code}</span>
                      <span className="text-sm text-muted-foreground">
                        {b.publicAlias ?? '—'} · {b.region ?? ''} {b.city ?? ''}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-primary">
                        <FileText className="h-3 w-3" />
                        {t('beneficiaries.openFullFile')}
                      </span>
                    </div>
                    <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
