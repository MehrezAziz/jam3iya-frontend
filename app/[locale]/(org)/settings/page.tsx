'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Building2, ImageIcon, KeyRound, Languages, Loader2, MapPin, Users } from 'lucide-react';
import { DualDateHeader } from '@/components/dual-date-header';
import { LanguageOptionList } from '@/components/language-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PinInput } from '@/components/pin-input';
import { cn } from '@/lib/utils';
import { listGovernorates, listDelegations, type Governorate } from '@/lib/api/geo';
import {
  myOrganization,
  organizationLogoUrl,
  uploadOrganizationLogo,
  removeOrganizationLogo,
  listDepartments,
  getMainDepartment,
  updateMainDepartmentLocation,
  getBeneficiaryAccessStatus,
  setBeneficiaryAccessPin,
  changeBeneficiaryAccessPin,
  createDepartment,
  type Department,
  type OrganizationProfile,
} from '@/lib/api/tenancy';
import { useDepartmentScope } from '@/lib/department-scope';

function parseDepartmentApiError(
  err: unknown,
  t: (k: string) => string,
): { password?: string; loginEmail?: string; name?: string; general?: string } {
  const e = err as Error & { body?: { message?: string; issues?: { fieldErrors?: Record<string, string[]> } } };
  const out: { password?: string; loginEmail?: string; name?: string; general?: string } = {};

  const fieldErrors = e.body?.issues?.fieldErrors;
  if (fieldErrors?.password?.[0]) {
    out.password =
      fieldErrors.password[0].includes('12') || fieldErrors.password[0].includes('too_small')
        ? t('settings.departmentPasswordMin')
        : fieldErrors.password[0];
  }
  if (fieldErrors?.loginEmail?.[0]) {
    out.loginEmail = fieldErrors.loginEmail[0];
  }
  if (fieldErrors?.name?.[0]) {
    out.name = fieldErrors.name[0];
  }

  const msg = e.body?.message ?? e.message ?? '';
  if (!out.password && !out.loginEmail && !out.name) {
    if (msg.includes('12') && msg.toLowerCase().includes('password')) {
      out.password = t('settings.departmentPasswordMin');
    } else if (msg.toLowerCase().includes('login email') || msg.toLowerCase().includes('email')) {
      out.loginEmail = msg;
    } else if (msg) {
      out.general = typeof msg === 'string' ? msg : t('common.error');
    }
  }
  return out;
}

export default function SettingsPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const { lockedDepartmentId } = useDepartmentScope();

  const orgQ = useQuery({
    queryKey: ['organization'],
    queryFn: () => myOrganization(),
  });

  const deptsQ = useQuery({
    queryKey: ['departments'],
    queryFn: () => listDepartments(),
  });

  const mainDeptQ = useQuery({
    queryKey: ['main-department'],
    queryFn: () => getMainDepartment(),
  });

  const pinStatusQ = useQuery({
    queryKey: ['beneficiary-access'],
    queryFn: () => getBeneficiaryAccessStatus(),
  });

  const loading = orgQ.isLoading || deptsQ.isLoading || mainDeptQ.isLoading || pinStatusQ.isLoading;
  const error = orgQ.error ?? deptsQ.error ?? mainDeptQ.error ?? pinStatusQ.error;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.settings')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
        </div>
        <DualDateHeader className="shrink-0 text-end" />
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <>
          <InterfaceLanguageCard t={t} />
          {orgQ.data ? <OrgLogoCard org={orgQ.data} t={t} onUpdated={() => qc.invalidateQueries({ queryKey: ['organization'] })} /> : null}
          {orgQ.data ? <OrgProfileCard org={orgQ.data} t={t} /> : null}
          <BeneficiaryPinCard pinConfigured={pinStatusQ.data?.pinConfigured ?? false} t={t} />
          {mainDeptQ.data ? (
            <MainDepartmentLocationCard
              main={mainDeptQ.data}
              t={t}
              onSaved={() => {
                void qc.invalidateQueries({ queryKey: ['main-department'] });
                void qc.invalidateQueries({ queryKey: ['departments'] });
              }}
            />
          ) : null}
          {!lockedDepartmentId ? (
            <DepartmentCreateCard
              t={t}
              onCreated={() => void qc.invalidateQueries({ queryKey: ['departments'] })}
            />
          ) : null}
          <DepartmentsList departments={deptsQ.data ?? []} t={t} />
        </>
      )}
    </div>
  );
}

function InterfaceLanguageCard({ t }: { t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Languages className="h-3.5 w-3.5" />
            {t('settings.interfaceLanguage')}
          </CardTitle>
          <CardDescription className="text-xs">{t('settings.interfaceLanguageHint')}</CardDescription>
        </div>
        <LanguageOptionList compact className="shrink-0" />
      </CardHeader>
    </Card>
  );
}

function OrgLogoCard({
  org,
  t,
  onUpdated,
}: {
  org: OrganizationProfile;
  t: (k: string) => string;
  onUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const logoSrc = org.logoFileId ? organizationLogoUrl() : null;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadOrganizationLogo(file);
      toast.success(t('settings.logoSaved'));
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function onRemove() {
    setUploading(true);
    try {
      await removeOrganizationLogo();
      toast.success(t('settings.logoRemoved'));
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          {t('settings.orgLogo')}
        </CardTitle>
        <CardDescription>{t('settings.orgLogoHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-border bg-muted/30">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="max-h-16 max-w-16 object-contain" />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">{t('settings.noLogo')}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-logo-upload" className="cursor-pointer">
            <span className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted">
              {uploading ? t('common.loading') : t('settings.uploadLogo')}
            </span>
            <input
              id="org-logo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={onFileChange}
            />
          </Label>
          {org.logoFileId ? (
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={onRemove}>
              {t('settings.removeLogo')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function OrgProfileCard({ org, t }: { org: OrganizationProfile; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          {t('settings.orgProfile')}
        </CardTitle>
        <CardDescription>{t('settings.orgProfileHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileField label={t('settings.legalName')}>{org.legalName}</ProfileField>
          <ProfileField label={t('settings.slug')}>
            <span className="font-mono">{org.slug}</span>
          </ProfileField>
          <ProfileField label={t('settings.country')}>{org.country}</ProfileField>
          <ProfileField label={t('settings.defaultCurrency')}>{org.defaultCurrency}</ProfileField>
          <ProfileField label={t('settings.defaultLanguage')}>{org.defaultLanguage}</ProfileField>
          <ProfileField label={t('settings.timezone')}>{org.timezone}</ProfileField>
          <ProfileField label={t('settings.fiscalId')}>
            {org.fiscalId ?? <span className="text-muted-foreground">—</span>}
          </ProfileField>
          <ProfileField label={t('settings.billSeries')}>{org.defaultBillSeries}</ProfileField>
          <ProfileField label={t('settings.status')}>{org.status}</ProfileField>
          <ProfileField label={t('settings.publicPage')}>
            {org.publicPageEnabled ? t('settings.enabled') : t('settings.disabled')}
          </ProfileField>
        </dl>
      </CardContent>
    </Card>
  );
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function BeneficiaryPinCard({
  pinConfigured,
  t,
}: {
  pinConfigured: boolean;
  t: (k: string) => string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<'pin' | 'password'>('pin');
  const [oldPin, setOldPin] = useState('');
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pending, setPending] = useState(false);

  function resetForm() {
    setEditing(false);
    setOldPin('');
    setPassword('');
    setNewPin('');
    setConfirmPin('');
    setVerifyMethod('pin');
  }

  async function savePin() {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      toast.error(t('beneficiaries.pinInvalid'));
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(t('settings.pinMismatch'));
      return;
    }

    if (pinConfigured && editing) {
      if (verifyMethod === 'pin' && oldPin.length !== 4) {
        toast.error(t('settings.oldPinRequired'));
        return;
      }
      if (verifyMethod === 'password' && !password.trim()) {
        toast.error(t('settings.passwordRequired'));
        return;
      }
    }

    setPending(true);
    try {
      if (pinConfigured && editing) {
        await changeBeneficiaryAccessPin({
          newPin,
          ...(verifyMethod === 'pin' ? { oldPin } : { password }),
        });
      } else {
        await setBeneficiaryAccessPin(newPin);
      }
      toast.success(t('settings.pinSaved'));
      resetForm();
      void qc.invalidateQueries({ queryKey: ['beneficiary-access'] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function clearPin() {
    setPending(true);
    try {
      await setBeneficiaryAccessPin(null);
      toast.success(t('settings.pinCleared'));
      resetForm();
      void qc.invalidateQueries({ queryKey: ['beneficiary-access'] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const showSetForm = !pinConfigured || editing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          {t('settings.beneficiaryPinTitle')}
        </CardTitle>
        <CardDescription>{t('settings.beneficiaryPinHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {pinConfigured ? t('settings.pinConfigured') : t('settings.pinNotConfigured')}
        </p>

        {pinConfigured && !editing ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              {t('settings.editPin')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void clearPin()} disabled={pending}>
              {t('settings.clearPin')}
            </Button>
          </div>
        ) : null}

        {showSetForm ? (
          <div className="space-y-4">
            {pinConfigured && editing ? (
              <>
                <p className="text-sm text-muted-foreground">{t('settings.changePinHint')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={verifyMethod === 'pin' ? 'default' : 'outline'}
                    onClick={() => setVerifyMethod('pin')}
                  >
                    {t('settings.verifyWithOldPin')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={verifyMethod === 'password' ? 'default' : 'outline'}
                    onClick={() => setVerifyMethod('password')}
                  >
                    {t('settings.verifyWithPassword')}
                  </Button>
                </div>
                {verifyMethod === 'pin' ? (
                  <div className="space-y-2">
                    <Label>{t('settings.currentPin')}</Label>
                    <PinInput value={oldPin} onChange={setOldPin} disabled={pending} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="pin-verify-password">{t('auth.password')}</Label>
                    <Input
                      id="pin-verify-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={pending}
                    />
                  </div>
                )}
              </>
            ) : null}

            <div className="space-y-2">
              <Label>{t('settings.newPin')}</Label>
              <PinInput value={newPin} onChange={setNewPin} disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.confirmPin')}</Label>
              <PinInput value={confirmPin} onChange={setConfirmPin} disabled={pending} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void savePin()} disabled={pending}>
                {pending ? t('common.loading') : t('settings.savePin')}
              </Button>
              {pinConfigured && editing ? (
                <Button type="button" variant="outline" onClick={resetForm} disabled={pending}>
                  {t('common.cancel')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MainDepartmentLocationCard({
  main,
  t,
  onSaved,
}: {
  main: { region: string | null; city: string | null };
  t: (k: string) => string;
  onSaved: () => void;
}) {
  const [region, setRegion] = useState(main.region ?? '');
  const [city, setCity] = useState(main.city ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRegion(main.region ?? '');
    setCity(main.city ?? '');
  }, [main.region, main.city]);

  const { data: governorates } = useQuery<Governorate[]>({
    queryKey: ['governorates'],
    queryFn: listGovernorates,
  });

  const selectedGov = governorates?.find((g) => g.name === region);
  const { data: delegations } = useQuery({
    queryKey: ['delegations', selectedGov?.id],
    queryFn: () => listDelegations(selectedGov!.id),
    enabled: !!selectedGov?.id,
  });

  async function save() {
    setSaving(true);
    try {
      await updateMainDepartmentLocation({
        region: region || null,
        city: city || null,
      });
      toast.success(t('common.successUpdated'));
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          {t('settings.mainDeptLocation')}
        </CardTitle>
        <CardDescription>{t('settings.mainDeptLocationHint')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('beneficiaries.governorate')}</Label>
          <Select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCity('');
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
        <div className="space-y-2">
          <Label>{t('beneficiaries.delegation')}</Label>
          <Select value={city} onChange={(e) => setCity(e.target.value)} disabled={!selectedGov}>
            <option value="">—</option>
            {(delegations ?? []).map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentCreateCard({
  t,
  onCreated,
}: {
  t: (k: string) => string;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    loginEmail?: string;
    password?: string;
    general?: string;
  }>({});
  const [pending, setPending] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < 12;
  const pairMismatch =
    (loginEmail.trim().length > 0 && !password.trim()) || (!loginEmail.trim() && password.trim().length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};

    if (!name.trim()) {
      next.name = t('validation.required');
    }
    if (pairMismatch) {
      next.loginEmail = t('settings.departmentLoginPairRequired');
      next.password = t('settings.departmentLoginPairRequired');
    }
    if (passwordTooShort) {
      next.password = t('settings.departmentPasswordMin');
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setPending(true);
    setErrors({});
    try {
      await createDepartment({
        name: name.trim(),
        description: description.trim() || undefined,
        loginEmail: loginEmail.trim() || undefined,
        password: password.trim() || undefined,
      });
      toast.success(t('settings.departmentCreated'));
      setName('');
      setDescription('');
      setLoginEmail('');
      setPassword('');
      onCreated();
    } catch (err) {
      const parsed = parseDepartmentApiError(err, t);
      if (Object.keys(parsed).length === 0) {
        toast.error((err as Error).message);
      } else {
        setErrors(parsed);
        if (parsed.general) toast.error(parsed.general);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.createDepartment')}</CardTitle>
        <CardDescription>{t('settings.createDepartmentHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dept-name">{t('settings.departmentName')}</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-login-email">{t('settings.departmentLoginEmail')}</Label>
            <Input
              id="dept-login-email"
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={pending}
              className={cn(errors.loginEmail && 'border-destructive')}
            />
            {errors.loginEmail ? <p className="text-xs text-destructive">{errors.loginEmail}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-password">{t('settings.departmentPassword')}</Label>
            <Input
              id="dept-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className={cn((passwordTooShort || errors.password) && 'border-destructive')}
            />
            {passwordTooShort || errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password ?? t('settings.departmentPasswordMin')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dept-desc">{t('settings.departmentDescription')}</Label>
            <Input
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
            />
          </div>
          {errors.general ? (
            <p className="text-xs text-destructive sm:col-span-2">{errors.general}</p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('common.loading') : t('settings.createDepartmentBtn')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DepartmentsList({ departments, t }: { departments: Department[]; t: (k: string) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          {t('settings.departments')}
        </CardTitle>
        <CardDescription>{t('settings.departmentsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          departments.map((d) => (
            <div key={d.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.name}</span>
                {d.isMain ? <Badge variant="muted">{t('settings.main')}</Badge> : null}
              </div>
              {d.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
              ) : null}
              {(d.region || d.city) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[d.region, d.city].filter(Boolean).join(' · ')}
                </p>
              )}
              {d.loginEmail ? (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">{t('settings.departmentLoginEmail')}: </span>
                  <span className="font-mono">{d.loginEmail}</span>
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
