'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { donationStats } from '@/lib/api/donations';
import { formatTndMinor } from '@/lib/utils';
import { DonationsMonthlyCharts, DistributionsMonthlyChart, type MonthlyPoint } from '@/components/charts/monthly-chart';

interface Stats {
  month: {
    donationsCount: number;
    donationsSumMinor: number;
    distributionsCount: number;
    distributionsSumMinor: number;
  };
  donationsByMonth: MonthlyPoint[];
  distributionsByMonth: MonthlyPoint[];
  currentActiveBeneficiaries: number;
  openCases: number;
}

export default function DashboardPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ['donation-stats'],
    queryFn: () => donationStats() as Promise<Stats>,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
      </header>
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <Stat title={t('dashboard.openCases')} value={String(data.openCases)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.donationsCharts')}</CardTitle>
              <CardDescription>{t('dashboard.donationsChartsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DonationsMonthlyCharts data={data.donationsByMonth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.distributionsCharts')}</CardTitle>
              <CardDescription>{t('dashboard.distributionsChartsHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DistributionsMonthlyChart data={data.distributionsByMonth} />
            </CardContent>
          </Card>
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
      {caption && <CardContent className="text-xs text-muted-foreground">{caption}</CardContent>}
    </Card>
  );
}
