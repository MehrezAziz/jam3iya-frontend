'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatTndMinor } from '@/lib/utils';

export interface MonthlyPoint {
  month: string;
  count: number;
  sumMinor: number;
}

export function DonationsMonthlyCharts({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((d) => ({
    month: d.month,
    count: d.count,
    amount: d.sumMinor / 1000,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartBlock title="Donations (TND)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} TND`, 'Amount']} />
            <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>
      <ChartBlock title="Donation count">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </ChartBlock>
    </div>
  );
}

export function DistributionsMonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((d) => ({
    month: d.month,
    amount: d.sumMinor / 1000,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  return (
    <ChartBlock title="Cash distributed (TND)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v) => [`${formatTndMinor(Math.round(Number(v) * 1000))}`, 'Distributed']}
          />
          <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartBlock>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}
