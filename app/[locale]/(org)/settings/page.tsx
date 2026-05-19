'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  myOrganization,
  listDepartments,
  getBeneficiaryAccessStatus,
  setBeneficiaryAccessPin,
  changeBeneficiaryAccessPin,
  createDepartment,
  type OrganizationProfile,
  type Department,
} from '@/lib/api/tenancy';
import { PinInput } from '@/components/pin-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

      <BeneficiaryPinCard t={t} />

      <DepartmentCreateCard t={t} />

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

function BeneficiaryPinCard({ t }: { t: (k: string) => string }) {
  const qc = useQueryClient();
  const statusQ = useQuery({
    queryKey: ['beneficiary-access'],
    queryFn: () => getBeneficiaryAccessStatus(),
  });
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const configured = statusQ.data?.pinConfigured ?? false;

  const saveMut = useMutation({
    mutationFn: () => {
      if (pin.length !== 4) throw new Error(t('beneficiaries.pinInvalid'));
      if (pin !== confirmPin) throw new Error(t('settings.pinMismatch'));
      if (configured) {
        if (!usePassword && oldPin.length !== 4) throw new Error(t('settings.oldPinRequired'));
        if (usePassword && password.length < 8) throw new Error(t('settings.passwordRequired'));
        return changeBeneficiaryAccessPin({
          newPin: pin,
          oldPin: usePassword ? undefined : oldPin,
          password: usePassword ? password : undefined,
        });
      }
      return setBeneficiaryAccessPin(pin);
    },
    onSuccess: () => {
      toast.success(t('settings.pinSaved'));
      setPin('');
      setConfirmPin('');
      setOldPin('');
      setPassword('');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['beneficiary-access'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const clearMut = useMutation({
    mutationFn: () => setBeneficiaryAccessPin(null),
    onSuccess: () => {
      toast.success(t('settings.pinCleared'));
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['beneficiary-access'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const showForm = !configured || editing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t('settings.beneficiaryPinTitle')}
        </CardTitle>
        <CardDescription>{t('settings.beneficiaryPinHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusQ.isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {configured ? t('settings.pinConfigured') : t('settings.pinNotConfigured')}
            </p>
            {configured && !editing ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  {t('settings.editPin')}
                </Button>
                <Button variant="outline" onClick={() => clearMut.mutate()} disabled={clearMut.isPending}>
                  {t('settings.clearPin')}
                </Button>
              </div>
            ) : null}
            {showForm ? (
              <>
                {configured ? (
                  <div className="space-y-3 rounded-md border border-dashed p-3">
                    <p className="text-sm text-muted-foreground">{t('settings.changePinHint')}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={usePassword ? 'outline' : 'default'}
                        onClick={() => setUsePassword(false)}
                      >
                        {t('settings.verifyWithOldPin')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={usePassword ? 'default' : 'outline'}
                        onClick={() => setUsePassword(true)}
                      >
                        {t('settings.verifyWithPassword')}
                      </Button>
                    </div>
                    {usePassword ? (
                      <div>
                        <Label>{t('auth.password')}</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                    ) : (
                      <div>
                        <Label>{t('settings.currentPin')}</Label>
                        <PinInput value={oldPin} onChange={setOldPin} />
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.newPin')}</p>
                  <PinInput value={pin} onChange={setPin} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('settings.confirmPin')}</p>
                  <PinInput value={confirmPin} onChange={setConfirmPin} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => saveMut.mutate()}
                    disabled={saveMut.isPending || pin.length !== 4 || confirmPin.length !== 4}
                  >
                    {t('settings.savePin')}
                  </Button>
                  {configured ? (
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      {t('common.cancel')}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentCreateCard({ t }: { t: (k: string) => string }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      const code = loginCode.trim().toLowerCase();
      if ((code && !password) || (!code && password)) {
        throw new Error(t('settings.departmentLoginPairRequired'));
      }
      return createDepartment({
        name: name.trim(),
        description: description.trim() || undefined,
        loginCode: code || undefined,
        password: password || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('settings.departmentCreated'));
      setName('');
      setLoginCode('');
      setPassword('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.createDepartment')}</CardTitle>
        <CardDescription>{t('settings.createDepartmentHint')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>{t('settings.departmentName')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t('settings.departmentLoginCode')}</Label>
          <Input value={loginCode} onChange={(e) => setLoginCode(e.target.value)} placeholder="finance" />
        </div>
        <div>
          <Label>{t('settings.departmentPassword')}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label>{t('settings.departmentDescription')}</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => mut.mutate()} disabled={!name || mut.isPending}>
            {t('settings.createDepartmentBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
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
