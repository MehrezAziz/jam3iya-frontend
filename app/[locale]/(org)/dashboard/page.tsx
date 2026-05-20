'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { donationStats, type DonationStats } from '@/lib/api/donations';
import { formatTndMinor } from '@/lib/utils';
import {
  DonationsMonthlyCharts,
  DistributionsMonthlyChart,
} from '@/components/charts/monthly-chart';
import {
  DepartmentDonationsChart,
  DepartmentDistributionsChart,
} from '@/components/charts/department-series-chart';
import { DepartmentTransfersCard } from '@/components/department-transfers-card';

export default function DashboardPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery<DonationStats>({
    queryKey: ['donation-stats'],
    queryFn: () => donationStats(),
  });

  const showDeptBreakdown =
    data?.departmentSeries && data.departmentSeries.length > 0 && data.departmentSeries.length <= 3;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        {data?.scopeDepartmentName ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.departmentScope', { name: data.scopeDepartmentName })}
          </p>
        ) : null}
      </header>
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat
              title={t('dashboard.availableBalance')}
              value={formatTndMinor(data.availableBalanceMinor)}
              caption={t('dashboard.availableBalanceHint')}
            />
            <Stat
              title={t('dashboard.thisMonthDonations')}
              value={formatTndMinor(data.month.donationsSumMinor)}
              caption={`${data.month.donationsCount} ${t('dashboard.donations')}`}
            />
            <Stat
              title={t('dashboard.thisMonthDistributions')}
              value={formatTndMinor(data.month.distributionsSumMinor)}
              caption={`${data.month.distributionsCount} ${t('dashboard.deliveries')}`}
            />
            <Stat title={t('dashboard.activeBeneficiaries')} value={String(data.currentActiveBeneficiaries)} />
          </div>

          {data.departmentBalances && data.departmentBalances.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.departmentBalances')}</CardTitle>
                <CardDescription>{t('dashboard.departmentBalancesHint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {data.departmentBalances.map((b) => (
                    <li key={b.departmentId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="font-medium">{b.departmentName}</span>
                      <span className="tabular-nums font-semibold text-primary">
                        {formatTndMinor(b.availableBalanceMinor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {data.canManageTransfers ? <DepartmentTransfersCard /> : null}

          <Card>
            <CardHeader>
              <CardTitle>
                {showDeptBreakdown ? t('dashboard.donationsChartsByDept') : t('dashboard.donationsCharts')}
              </CardTitle>
              <CardDescription>{t('dashboard.donationsChartsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {showDeptBreakdown ? (
                <DepartmentDonationsChart series={data.departmentSeries!} />
              ) : (
                <DonationsMonthlyCharts data={data.donationsByMonth} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {showDeptBreakdown
                  ? t('dashboard.distributionsChartsByDept')
                  : t('dashboard.distributionsCharts')}
              </CardTitle>
              <CardDescription>{t('dashboard.distributionsChartsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {showDeptBreakdown ? (
                <DepartmentDistributionsChart series={data.departmentSeries!} />
              ) : (
                <DistributionsMonthlyChart data={data.distributionsByMonth} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Stat title={t('dashboard.openCases')} value={String(data.openCases)} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ title, value, caption }: { title: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {caption ? <CardContent className="text-xs text-muted-foreground">{caption}</CardContent> : null}
    </Card>
  );
}
