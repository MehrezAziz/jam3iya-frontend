'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api/client';

interface AuditRow {
  id: string;
  action: string;
  outcome: string;
  resourceType: string | null;
  resourceId: string | null;
  reason: string | null;
  actorUserId: string | null;
  at: string;
}

export default function AuditPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery<AuditRow[]>({
    queryKey: ['audit', 'organization'],
    queryFn: () => api<AuditRow[]>('/audit/organization?limit=200'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t('nav.audit')}</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : !data || data.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">—</div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.map((row) => (
                <li key={row.id} className="grid grid-cols-12 gap-2 px-4 py-2">
                  <div className="col-span-3 text-muted-foreground">{new Date(row.at).toLocaleString()}</div>
                  <div className="col-span-3 font-mono">{row.action}</div>
                  <div className="col-span-2">{row.outcome}</div>
                  <div className="col-span-2 truncate text-xs text-muted-foreground">{row.resourceId ?? ''}</div>
                  <div className="col-span-2 truncate">{row.reason ?? ''}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
