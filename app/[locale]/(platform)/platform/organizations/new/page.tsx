'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  createPlatformOrganization,
  type CreateOrganizationResult,
} from '@/lib/api/platform';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { listGovernorates, listDelegations, type Governorate } from '@/lib/api/geo';
import { CheckCircle2, Copy, AlertTriangle } from 'lucide-react';
import { optionalPhoneFormSchema } from '@/lib/phone';
import { PhoneInput } from '@/components/phone-input';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

const schema = z.object({
  legalName: z.string().min(2).max(200),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(slugRegex)
    .refine((s) => !s.startsWith('__'), 'Reserved prefix'),
  country: z.string().length(2),
  defaultCurrency: z.string().length(3),
  defaultLanguage: z.enum(['ar', 'fr', 'en']),
  timezone: z.string(),
  fiscalId: z.string().max(40).optional().or(z.literal('')),
  publicPageEnabled: z.boolean(),
  mainDepartmentName: z.string().min(2),
  mainDepartmentRegion: z.string().max(120).optional(),
  mainDepartmentCity: z.string().max(120).optional(),
  admin: z.object({
    email: z.string().email().max(254),
    fullName: z.string().min(2).max(200),
    phone: optionalPhoneFormSchema,
    locale: z.enum(['ar', 'fr', 'en']),
    initialPassword: z
      .string()
      .min(12)
      .max(128)
      .optional()
      .or(z.literal('')),
  }),
});
type FormValues = z.infer<typeof schema>;

export default function NewOrganizationPage() {
  const t = useTranslations();
  const router = useRouter();
  const [result, setResult] = useState<CreateOrganizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      legalName: '',
      slug: '',
      country: 'TN',
      defaultCurrency: 'TND',
      defaultLanguage: 'ar',
      timezone: 'Africa/Tunis',
      fiscalId: '',
      publicPageEnabled: true,
      mainDepartmentName: 'Administration',
      mainDepartmentRegion: '',
      mainDepartmentCity: '',
      admin: { email: '', fullName: '', phone: '', locale: 'ar', initialPassword: '' },
    },
  });

  const selectedGovName = form.watch('mainDepartmentRegion');
  const governoratesQ = useQuery<Governorate[]>({
    queryKey: ['governorates'],
    queryFn: listGovernorates,
    retry: 1,
  });
  const governorates = governoratesQ.data;
  const selectedGov = governorates?.find((g) => g.name === selectedGovName);
  const { data: delegations } = useQuery({
    queryKey: ['delegations', selectedGov?.id],
    queryFn: () => listDelegations(selectedGov!.id),
    enabled: !!selectedGov?.id,
  });

  async function onSubmit(values: FormValues) {
    try {
      const created = await createPlatformOrganization({
        legalName: values.legalName,
        slug: values.slug,
        country: values.country,
        defaultCurrency: values.defaultCurrency,
        defaultLanguage: values.defaultLanguage,
        timezone: values.timezone,
        fiscalId: values.fiscalId ? values.fiscalId : undefined,
        publicPageEnabled: values.publicPageEnabled,
        mainDepartmentName: values.mainDepartmentName,
        mainDepartmentRegion: values.mainDepartmentRegion || undefined,
        mainDepartmentCity: values.mainDepartmentCity || undefined,
        admin: {
          email: values.admin.email,
          fullName: values.admin.fullName,
          phone: values.admin.phone ? values.admin.phone : undefined,
          locale: values.admin.locale,
          initialPassword: values.admin.initialPassword ? values.admin.initialPassword : undefined,
        },
      });
      setResult(created);
      toast.success(t('common.successCreated'));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (result) {
    const otp = result.admin.oneTimePassword;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              {t('platform.createdTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{t('platform.createdSubtitle')}</p>

            <div className="rounded-md border border-border bg-muted/40 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('platform.legalName')} value={result.organization.legalName} />
                <Field label={t('platform.slug')} value={result.organization.slug} mono />
                <Field label={t('platform.adminFullName')} value={result.admin.fullName} />
                <Field label={t('platform.adminEmail')} value={result.admin.email} mono />
              </div>
            </div>

            {otp ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t('platform.oneTimePassword')}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded bg-white px-3 py-2 font-mono text-sm">
                  <span>{otp}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(otp);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? t('platform.copied') : t('platform.copyButton')}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-900">{t('platform.mustChangePassword')}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push('/platform/organizations')}>
                {t('common.back')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  form.reset();
                }}
              >
                {t('platform.newOrganization')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('platform.createTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('platform.subtitle')}</p>
      </header>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('platform.listTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="legalName">{t('platform.legalName')}</Label>
              <Input id="legalName" {...form.register('legalName')} />
              <FieldError msg={form.formState.errors.legalName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">{t('platform.slug')}</Label>
              <Input id="slug" {...form.register('slug')} placeholder="helpfortunis" />
              <FieldError msg={form.formState.errors.slug?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fiscalId">{t('platform.fiscalId')}</Label>
              <Input id="fiscalId" {...form.register('fiscalId')} placeholder="1234567B" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">{t('platform.country')}</Label>
              <Input id="country" maxLength={2} {...form.register('country')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultCurrency">{t('platform.defaultCurrency')}</Label>
              <Input id="defaultCurrency" maxLength={3} {...form.register('defaultCurrency')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultLanguage">{t('platform.defaultLanguage')}</Label>
              <Select id="defaultLanguage" {...form.register('defaultLanguage')}>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">{t('platform.timezone')}</Label>
              <Input id="timezone" {...form.register('timezone')} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="mainDepartmentName">{t('platform.mainDepartmentName')}</Label>
              <Input id="mainDepartmentName" {...form.register('mainDepartmentName')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('platform.mainDepartmentRegion')}</Label>
              <Select
                {...form.register('mainDepartmentRegion')}
                onChange={(e) => {
                  form.setValue('mainDepartmentRegion', e.target.value);
                  form.setValue('mainDepartmentCity', '');
                }}
              >
                <option value="">—</option>
                {(governorates ?? []).map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
              {governoratesQ.isError ? (
                <p className="mt-1 text-xs text-destructive">{(governoratesQ.error as Error).message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>{t('platform.mainDepartmentCity')}</Label>
              <Select {...form.register('mainDepartmentCity')} disabled={!selectedGov}>
                <option value="">—</option>
                {(delegations ?? []).map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...form.register('publicPageEnabled')}
              />
              <span className="text-sm">{t('platform.publicPageEnabled')}</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('platform.initialAdmin')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="adminFullName">{t('platform.adminFullName')}</Label>
              <Input id="adminFullName" {...form.register('admin.fullName')} />
              <FieldError msg={form.formState.errors.admin?.fullName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">{t('platform.adminEmail')}</Label>
              <Input id="adminEmail" type="email" {...form.register('admin.email')} />
              <FieldError msg={form.formState.errors.admin?.email?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminPhone">{t('platform.adminPhone')}</Label>
              <PhoneInput id="adminPhone" {...form.register('admin.phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminLocale">{t('platform.defaultLanguage')}</Label>
              <Select id="adminLocale" {...form.register('admin.locale')}>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="initialPassword">{t('platform.adminPassword')}</Label>
              <Input id="initialPassword" type="text" {...form.register('admin.initialPassword')} />
              <FieldError msg={form.formState.errors.admin?.initialPassword?.message} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('platform.createButton')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
