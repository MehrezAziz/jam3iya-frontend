'use client';

import { use, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getBeneficiaryFull, updateBeneficiary } from '@/lib/api/beneficiaries';
import { getBeneficiaryAccessStatus, verifyBeneficiaryAccessPin } from '@/lib/api/tenancy';
import { PinInput } from '@/components/pin-input';

export default function EditBeneficiaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [pin, setPin] = useState('');

  const accessQ = useQuery({
    queryKey: ['beneficiary-access'],
    queryFn: () => getBeneficiaryAccessStatus(),
  });

  const canLoad =
    accessQ.data &&
    (!accessQ.data.pinConfigured || accessQ.data.accessGranted);

  const q = useQuery({
    queryKey: ['beneficiary-full', id],
    queryFn: () => getBeneficiaryFull(id),
    enabled: !!canLoad,
  });

  const save = useMutation({
    mutationFn: () =>
      updateBeneficiary(id, {
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender as 'male' | 'female',
        dateOfBirth: form.dateOfBirth || undefined,
        maritalStatus: form.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed' | 'separated',
        cin: form.cin || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        region: form.region || undefined,
        city: form.city || undefined,
        publicAlias: form.publicAlias || undefined,
      }),
    onSuccess: () => {
      toast.success(t('common.successUpdated'));
      router.push(`/beneficiaries/${id}`);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const b = q.data as {
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string | null;
    maritalStatus: string;
    cin: string | null;
    phone: string | null;
    address: string | null;
    region: string | null;
    city: string | null;
    publicAlias: string | null;
    code: string;
  } | undefined;

  useEffect(() => {
    if (!b) return;
    setForm({
      firstName: b.firstName,
      lastName: b.lastName,
      gender: b.gender,
      dateOfBirth: b.dateOfBirth ? String(b.dateOfBirth).slice(0, 10) : '',
      maritalStatus: b.maritalStatus,
      cin: b.cin ?? '',
      phone: b.phone ?? '',
      address: b.address ?? '',
      region: b.region ?? '',
      city: b.city ?? '',
      publicAlias: b.publicAlias ?? '',
    });
  }, [b]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function unlockWithPin() {
    if (pin.length !== 4) {
      toast.error(t('beneficiaries.pinInvalid'));
      return;
    }
    try {
      await verifyBeneficiaryAccessPin(pin);
      await accessQ.refetch();
      setPin('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (accessQ.isLoading || (canLoad && q.isLoading)) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (accessQ.data?.pinConfigured && !accessQ.data.accessGranted) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-xl font-bold">{t('beneficiaries.editProfile')}</h1>
        <p className="text-sm text-muted-foreground">{t('beneficiaries.enterPin')}</p>
        <PinInput value={pin} onChange={setPin} />
        <Button onClick={unlockWithPin} disabled={pin.length !== 4}>
          {t('beneficiaries.unlockButton')}
        </Button>
      </div>
    );
  }

  if (q.isError || !b) {
    return (
      <div className="p-8 text-destructive">{t('common.error')}</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href={`/beneficiaries/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{t('beneficiaries.editProfile')}</h1>
        <span className="font-mono text-sm text-muted-foreground">{b.code}</span>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('beneficiaries.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t('beneficiaries.firstName')} value={form.firstName ?? ''} onChange={(v) => set('firstName', v)} />
          <Field label={t('beneficiaries.lastName')} value={form.lastName ?? ''} onChange={(v) => set('lastName', v)} />
          <div>
            <Label>{t('beneficiaries.gender')}</Label>
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="male">{t('beneficiaries.male')}</option>
              <option value="female">{t('beneficiaries.female')}</option>
            </Select>
          </div>
          <div>
            <Label>{t('beneficiaries.dateOfBirth')}</Label>
            <DateInput value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </div>
          <Field label={t('beneficiaries.cin')} value={form.cin ?? ''} onChange={(v) => set('cin', v)} />
          <Field label={t('beneficiaries.phone')} value={form.phone ?? ''} onChange={(v) => set('phone', v)} />
          <div className="sm:col-span-2">
            <Label>{t('beneficiaries.address')}</Label>
            <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <Field label={t('beneficiaries.region')} value={form.region ?? ''} onChange={(v) => set('region', v)} />
          <Field label={t('beneficiaries.city')} value={form.city ?? ''} onChange={(v) => set('city', v)} />
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {t('common.update')}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/beneficiaries/${id}`}>{t('common.cancel')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
