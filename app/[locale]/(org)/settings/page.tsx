'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Building2,
  Globe2,
  Coins,
  Languages,
  CalendarClock,
  Hash,
  Eye,
  ShieldCheck,
  Workflow,
  Users2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { myOrganization, listDepartments, type OrganizationProfile, type Department } from '@/lib/api/tenancy';

export default function SettingsPage() {
  const t = useTranslations();
  const orgQ = useQuery<OrganizationProfile>({ queryKey: ['my-org'], queryFn: () => myOrganization() });
  const deptsQ = useQuery<Department[]>({ queryKey: ['departments'], queryFn: () => listDepartments() });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.settings')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('settings.orgProfile')}
          </CardTitle>
          <CardDescription>{t('settings.orgProfileHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {orgQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : orgQ.data ? (
            <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field icon={<Building2 className="h-3.5 w-3.5" />} label={t('settings.legalName')}>
                <div className="font-medium">{orgQ.data.legalName}</div>
              </Field>
              <Field icon={<Hash className="h-3.5 w-3.5" />} label={t('settings.slug')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{orgQ.data.slug}</code>
              </Field>
              <Field icon={<Globe2 className="h-3.5 w-3.5" />} label={t('settings.country')}>
                {orgQ.data.country}
              </Field>
              <Field icon={<Coins className="h-3.5 w-3.5" />} label={t('settings.defaultCurrency')}>
                {orgQ.data.defaultCurrency}
              </Field>
              <Field icon={<Languages className="h-3.5 w-3.5" />} label={t('settings.defaultLanguage')}>
                {languageLabel(orgQ.data.defaultLanguage)}
              </Field>
              <Field icon={<CalendarClock className="h-3.5 w-3.5" />} label={t('settings.timezone')}>
                {orgQ.data.timezone}
              </Field>
              <Field icon={<Hash className="h-3.5 w-3.5" />} label={t('settings.fiscalId')}>
                {orgQ.data.fiscalId ?? <span className="text-muted-foreground">—</span>}
              </Field>
              <Field icon={<Workflow className="h-3.5 w-3.5" />} label={t('settings.billSeries')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{orgQ.data.defaultBillSeries}</code>
              </Field>
              <Field icon={<ShieldCheck className="h-3.5 w-3.5" />} label={t('settings.status')}>
                <Badge variant={orgQ.data.status === 'active' ? 'success' : 'destructive'}>
                  {t(`platform.${orgQ.data.status}`)}
                </Badge>
              </Field>
              <Field icon={<Eye className="h-3.5 w-3.5" />} label={t('settings.publicPage')}>
                <Badge variant={orgQ.data.publicPageEnabled ? 'success' : 'muted'}>
                  {orgQ.data.publicPageEnabled ? t('settings.enabled') : t('settings.disabled')}
                </Badge>
              </Field>
            </dl>
          ) : (
            <p className="text-sm text-destructive">{t('common.error')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            {t('settings.departments')}
          </CardTitle>
          <CardDescription>{t('settings.departmentsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {deptsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : deptsQ.data && deptsQ.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {deptsQ.data.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.name}</span>
                      {d.isMain ? <Badge variant="default">{t('settings.main')}</Badge> : null}
                    </div>
                    {d.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
                    ) : null}
                  </div>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {d.id.slice(0, 8)}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('beneficiaries.noResults')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function languageLabel(code: string): string {
  switch (code) {
    case 'ar':
      return 'العربية';
    case 'fr':
      return 'Français';
    case 'en':
      return 'English';
    default:
      return code;
  }
}
