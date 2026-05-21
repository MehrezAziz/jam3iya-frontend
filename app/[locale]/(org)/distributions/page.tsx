'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  CheckCircle2,
  CircleDot,
  Coins,
  Gift,
  Package,
  PackageCheck,
  Plus,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import {
  listDistributions,
  deliverDistribution,
  cancelDistribution,
  type DistributionSummary,
} from '@/lib/api/distributions';

export default function DistributionsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['distributions'], queryFn: () => listDistributions() });

  const deliverMut = useMutation({
    mutationFn: (id: string) => deliverDistribution(id),
    onSuccess: () => {
      toast.success(t('distributions.delivered'));
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const cancelMut = useMutation({
    mutationFn: (args: { id: string; reason: string }) => cancelDistribution(args.id, args.reason),
    onSuccess: () => {
      toast.success(t('distributions.cancelled'));
      qc.invalidateQueries({ queryKey: ['distributions'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.distributions')}</h1>
          <p className="text-sm text-muted-foreground">{t('distributions.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/distributions/new">
            <Plus className="h-4 w-4" />
            {t('distributions.newButton')}
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('distributions.listTitle')}</CardTitle>
          <CardDescription>{t('distributions.listHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : q.data && q.data.items.length > 0 ? (
            <ul className="divide-y divide-border">
              {q.data.items.map((d) => (
                <DistributionRow
                  key={d.id}
                  d={d}
                  t={t}
                  onDeliver={(id) => deliverMut.mutate(id)}
                  onCancel={(id) => {
                    const reason = window.prompt(t('distributions.cancelPrompt'));
                    if (!reason || reason.trim().length < 3) return;
                    cancelMut.mutate({ id, reason: reason.trim() });
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('distributions.noResults')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DistributionRow({
  d,
  t,
  onDeliver,
  onCancel,
}: {
  d: DistributionSummary;
  t: (k: string) => string;
  onDeliver: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cashLine = d.lines.find((l) => l.lineKind === 'cash');
  const itemLines = d.lines.filter((l) => l.lineKind === 'item');
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          {d.kind === 'cash' ? (
            <Coins className="h-4 w-4" />
          ) : d.kind === 'goods' ? (
            <Gift className="h-4 w-4" />
          ) : (
            <Package className="h-4 w-4" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <User className="h-3 w-3 text-muted-foreground" />
            <code className="font-mono">{d.beneficiary.code}</code>
            {d.beneficiary.publicAlias ? (
              <span className="text-muted-foreground">/ {d.beneficiary.publicAlias}</span>
            ) : null}
            <StatusBadge status={d.status} t={t} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {d.deliveredAt
                ? `${t('distributions.deliveredAt')}: ${formatDateTime(d.deliveredAt)}`
                : d.plannedAt
                  ? `${t('distributions.plannedAt')}: ${formatDateTime(d.plannedAt)}`
                  : `${t('distributions.createdAt')}: ${formatDateTime(d.createdAt)}`}
            </span>
            <Badge variant="muted">{t(`distributions.kind_${d.kind}`)}</Badge>
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {cashLine && cashLine.amountMinor != null ? (
              <li>
                <Coins className="me-1 inline h-3 w-3 text-primary" />
                <span className="tabular-nums font-medium">
                  {formatMoney(cashLine.amountMinor, cashLine.currency ?? 'TND')}
                </span>
              </li>
            ) : null}
            {itemLines.map((l) => (
              <li key={l.id}>
                <Gift className="me-1 inline h-3 w-3 text-primary" />
                {l.item?.name} ×{' '}
                <span className="tabular-nums font-medium">
                  {l.quantity} {l.unit ?? l.item?.unit ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-2">
        {d.status === 'planned' || d.status === 'ready' ? (
          <>
            <Button size="sm" onClick={() => onDeliver(d.id)}>
              <PackageCheck className="h-3 w-3" />
              {t('distributions.markDelivered')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCancel(d.id)}>
              <XCircle className="h-3 w-3" />
              {t('common.cancel')}
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function StatusBadge({ status, t }: { status: DistributionSummary['status']; t: (k: string) => string }) {
  const variant: Record<DistributionSummary['status'], 'success' | 'warning' | 'destructive' | 'muted'> = {
    planned: 'warning',
    ready: 'warning',
    delivered: 'success',
    cancelled: 'destructive',
  };
  return (
    <Badge variant={variant[status]}>
      {status === 'delivered' ? <CheckCircle2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
      {t(`distributions.status_${status}`)}
    </Badge>
  );
}

function formatMoney(minor: number, currency: string): string {
  const amount = minor / 1000;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${currency}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
