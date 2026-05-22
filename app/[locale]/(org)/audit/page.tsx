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
            <div className="p-6 text-sm text-muted-foreground">{t('audit.noEntries')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <colgroup>
                  <col className="w-48" />
                  <col className="w-56" />
                  <col className="w-28" />
                  <col className="w-56" />
                  <col className="w-72" />
                </colgroup>
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">{t('audit.when')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('audit.action')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('audit.outcome')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('audit.resourceId')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('audit.reason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-2 align-top text-muted-foreground">
                        {new Date(row.at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 align-top font-mono text-xs">
                        <span className="block break-all">{row.action}</span>
                      </td>
                      <td className="px-4 py-2 align-top">{row.outcome}</td>
                      <td
                        className="truncate px-4 py-2 align-top text-xs text-muted-foreground"
                        title={row.resourceId ?? undefined}
                      >
                        {row.resourceId ?? '—'}
                      </td>
                      <td className="px-4 py-2 align-top" title={row.reason ?? undefined}>
                        <span className="line-clamp-2 break-words">{row.reason ?? '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
