'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyPoint } from '@/components/charts/monthly-chart';

const COLORS = ['var(--primary)', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6'];

export interface DepartmentSeries {
  departmentId: string;
  departmentName: string;
  donationsByMonth: MonthlyPoint[];
  distributionsByMonth: MonthlyPoint[];
}

function mergeMonths(series: DepartmentSeries[]) {
  const months = new Set<string>();
  for (const s of series) {
    for (const p of s.donationsByMonth) months.add(p.month);
    for (const p of s.distributionsByMonth) months.add(p.month);
  }
  return [...months].sort();
}

export function DepartmentDonationsChart({ series }: { series: DepartmentSeries[] }) {
  if (series.length === 0) return <p className="text-sm text-muted-foreground">—</p>;

  const months = mergeMonths(series);
  const data = months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const s of series) {
      const p = s.donationsByMonth.find((d) => d.month === month);
      row[s.departmentName] = (p?.sumMinor ?? 0) / 1000;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} TND`, '']} />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.departmentId}
            type="monotone"
            dataKey={s.departmentName}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentDistributionsChart({ series }: { series: DepartmentSeries[] }) {
  if (series.length === 0) return <p className="text-sm text-muted-foreground">—</p>;

  const months = mergeMonths(series);
  const data = months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const s of series) {
      const p = s.distributionsByMonth.find((d) => d.month === month);
      row[s.departmentName] = (p?.sumMinor ?? 0) / 1000;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} TND`, '']} />
        <Legend />
        {series.map((s, i) => (
          <Bar
            key={s.departmentId}
            dataKey={s.departmentName}
            fill={COLORS[i % COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
