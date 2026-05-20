'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { createBeneficiary } from '@/lib/api/beneficiaries';
import { normalizeCinInput, optionalCinSchema } from '@/lib/cin';
import { getMainDepartment, listDepartments, type Department } from '@/lib/api/tenancy';
import { useDepartmentScope } from '@/lib/department-scope';
import { listGovernorates, listDelegations, type Governorate, type Delegation } from '@/lib/api/geo';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'separated']),
  cin: z.string().regex(/^\d{8}$/).optional().or(z.literal('')),
  phone: z.string().max(40).optional(),
  address: z.string().max(500).optional(),
  region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  publicAlias: z.string().max(120).optional(),
  departmentId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewBeneficiaryPage() {
  const t = useTranslations();
  const router = useRouter();
  const { lockedDepartmentId } = useDepartmentScope();

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => listDepartments(),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'male', maritalStatus: 'single' },
  });

  const { data: governorates } = useQuery<Governorate[]>({
    queryKey: ['governorates'],
    queryFn: listGovernorates,
  });

  const selectedGovName = form.watch('region');
  const selectedGov = governorates?.find((g) => g.name === selectedGovName);
  const { data: delegations } = useQuery<Delegation[]>({
    queryKey: ['delegations', selectedGov?.id],
    queryFn: () => listDelegations(selectedGov!.id),
    enabled: !!selectedGov?.id,
  });

  const mainDeptQ = useQuery({
    queryKey: ['main-department'],
    queryFn: () => getMainDepartment(),
  });

  useEffect(() => {
    if (lockedDepartmentId) {
      form.setValue('departmentId', lockedDepartmentId);
      return;
    }
    if (departments && departments.length > 0 && !form.getValues('departmentId')) {
      const main = departments.find((d) => d.isMain) ?? departments[0];
      form.setValue('departmentId', main.id);
    }
  }, [departments, form, lockedDepartmentId]);

  useEffect(() => {
    const main = mainDeptQ.data;
    if (!main) return;
    if (!form.getValues('region') && main.region) form.setValue('region', main.region);
    if (!form.getValues('city') && main.city) form.setValue('city', main.city);
  }, [mainDeptQ.data, form]);

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth || undefined,
        cin: values.cin || undefined,
      };
      const result = await createBeneficiary(payload);
      toast.success(`${t('common.successCreated')} — ${result.code}`);
      router.push(`/beneficiaries/${result.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('beneficiaries.newTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('beneficiaries.newSubtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('beneficiaries.basicInfo')}</CardTitle>
          <CardDescription>{t('beneficiaries.basicInfoHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <Field label={t('beneficiaries.firstName')} required {...form.register('firstName')} />
            <Field label={t('beneficiaries.lastName')} required {...form.register('lastName')} />

            <div>
              <Label>{t('beneficiaries.gender')}</Label>
              <Select {...form.register('gender')}>
                <option value="male">{t('beneficiaries.male')}</option>
                <option value="female">{t('beneficiaries.female')}</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">{t('beneficiaries.dateOfBirth')}</Label>
              <DateInput id="dateOfBirth" {...form.register('dateOfBirth')} />
            </div>

            <div>
              <Label>{t('beneficiaries.maritalStatus')}</Label>
              <Select {...form.register('maritalStatus')}>
                <option value="single">{t('beneficiaries.marital_single')}</option>
                <option value="married">{t('beneficiaries.marital_married')}</option>
                <option value="divorced">{t('beneficiaries.marital_divorced')}</option>
                <option value="widowed">{t('beneficiaries.marital_widowed')}</option>
                <option value="separated">{t('beneficiaries.marital_separated')}</option>
              </Select>
            </div>
            <div>
              <Label>{t('beneficiaries.cin')}</Label>
              <Input
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                placeholder="00000000"
                {...form.register('cin', {
                  onChange: (e) => {
                    form.setValue('cin', normalizeCinInput(e.target.value), { shouldValidate: true });
                  },
                })}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('beneficiaries.cinHint')}</p>
              {form.formState.errors.cin ? (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.cin.message}</p>
              ) : null}
            </div>
            <Field label={t('beneficiaries.phone')} {...form.register('phone')} />
            <Field label={t('beneficiaries.publicAlias')} {...form.register('publicAlias')} />
            <div>
              <Label>{t('beneficiaries.governorate')}</Label>
              <Select
                {...form.register('region')}
                onChange={(e) => {
                  form.setValue('region', e.target.value);
                  form.setValue('city', '');
                }}
              >
                <option value="">—</option>
                {(governorates ?? []).map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('beneficiaries.delegation')}</Label>
              <Select {...form.register('city')} disabled={!selectedGov}>
                <option value="">—</option>
                {(delegations ?? []).map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>{t('beneficiaries.address')}</Label>
              <Input {...form.register('address')} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('beneficiaries.department')}</Label>
              {lockedDepartmentId ? (
                <Input
                  readOnly
                  disabled
                  value={
                    (departments ?? []).find((d) => d.id === lockedDepartmentId)?.name ??
                    lockedDepartmentId
                  }
                />
              ) : (
                <Select {...form.register('departmentId')}>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>{t('beneficiaries.reason')}</Label>
              <Input {...form.register('reason')} />
            </div>

            <div className="md:col-span-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {t('beneficiaries.completeLaterHint')}
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('common.loading') : t('beneficiaries.createAndContinue')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={props.name as string}>
        {label}
        {required ? <span className="ms-0.5 text-destructive">*</span> : null}
      </Label>
      <Input id={props.name as string} {...props} />
    </div>
  );
}
