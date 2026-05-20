'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listPlatformOrganizations,
  suspendPlatformOrganization,
  type PlatformOrgSummary,
} from '@/lib/api/platform';
import { Building2, Eye, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformOrgsPage() {
  const t = useTranslations();
  const qc = useQueryClient();

  const orgsQuery = useQuery({
    queryKey: ['platform', 'orgs'],
    queryFn: listPlatformOrganizations,
  });

  const suspendMutation = useMutation({
    mutationFn: async (vars: { id: string; suspended: boolean; reason?: string }) =>
      suspendPlatformOrganization(vars.id, { suspended: vars.suspended, reason: vars.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'orgs'] });
      toast.success(t('common.successUpdated'));
    },
    onError: (err) => toast.error((err as Error).message),
  });

  function statusBadge(s: PlatformOrgSummary['status']) {
    const variant: Record<typeof s, 'success' | 'destructive' | 'muted'> = {
      active: 'success',
      suspended: 'destructive',
      closed: 'muted',
    };
    return <Badge variant={variant[s]}>{t(`platform.${s}`)}</Badge>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('platform.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('platform.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/organizations/new">
            <Plus className="h-4 w-4" />
            {t('platform.newOrganization')}
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('platform.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {orgsQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : orgsQuery.data && orgsQuery.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-start text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t('platform.legalName')}</th>
                  <th className="px-4 py-3 text-start">{t('platform.slug')}</th>
                  <th className="px-4 py-3 text-start">{t('platform.status')}</th>
                  <th className="px-4 py-3 text-start">{t('platform.users')}</th>
                  <th className="px-4 py-3 text-start">{t('platform.depts')}</th>
                  <th className="px-4 py-3 text-start">{t('platform.created')}</th>
                  <th className="px-4 py-3 text-end">{t('common.cancel')}</th>
                </tr>
              </thead>
              <tbody>
                {orgsQuery.data.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.legalName}</div>
                      {o.fiscalId ? (
                        <div className="text-xs text-muted-foreground">MF {o.fiscalId}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{o.slug}</td>
                    <td className="px-4 py-3">{statusBadge(o.status)}</td>
                    <td className="px-4 py-3">{o.userCount}</td>
                    <td className="px-4 py-3">{o.departmentCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/organizations/${o.id}`}>
                            <Eye className="h-3 w-3" />
                            {t('platform.viewOrg')}
                          </Link>
                        </Button>
                        <Button
                        variant={o.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        disabled={suspendMutation.isPending}
                        onClick={() => {
                          const willSuspend = o.status === 'active';
                          let reason: string | undefined;
                          if (willSuspend) {
                            const raw = window.prompt(t('platform.suspendReason'));
                            if (raw === null) return;
                            reason = raw.trim() ? raw.trim() : undefined;
                          }
                          suspendMutation.mutate({
                            id: o.id,
                            suspended: willSuspend,
                            reason,
                          });
                        }}
                      >
                        <Power className="h-3 w-3" />
                        {o.status === 'active' ? t('platform.suspend') : t('platform.reactivate')}
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">{t('beneficiaries.noResults')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
