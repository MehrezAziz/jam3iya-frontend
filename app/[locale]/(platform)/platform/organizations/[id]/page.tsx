'use client';

import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, KeyRound, Mail, MapPin, Phone, Building2, User2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/phone-input';
import { phoneOptionalFromInput } from '@/lib/phone';
import {
  getPlatformOrganization,
  resetOrgAdminPassword,
  updateOrgAdmin,
  type PlatformOrgDetail,
} from '@/lib/api/platform';

export default function PlatformOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const qc = useQueryClient();
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const orgQ = useQuery({
    queryKey: ['platform', 'org', id],
    queryFn: () => getPlatformOrganization(id),
  });

  const resetMut = useMutation({
    mutationFn: (vars: { userId: string; newPassword?: string }) =>
      resetOrgAdminPassword(id, vars.userId, vars.newPassword ? { newPassword: vars.newPassword } : {}),
    onSuccess: (res) => {
      if (res.oneTimePassword) {
        setResetResult({ email: res.email, password: res.oneTimePassword });
        toast.success(t('platform.passwordResetGenerated'));
      } else {
        toast.success(t('platform.passwordResetDone'));
        setResetResult(null);
      }
      qc.invalidateQueries({ queryKey: ['platform', 'org', id] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: (vars: {
      userId: string;
      email: string;
      fullName: string;
      phone: string;
      locale: 'ar' | 'fr' | 'en';
      newPassword?: string;
    }) =>
      updateOrgAdmin(id, vars.userId, {
        email: vars.email,
        fullName: vars.fullName,
        phone: vars.phone.trim() || null,
        locale: vars.locale,
        ...(vars.newPassword ? { newPassword: vars.newPassword } : {}),
      }),
    onSuccess: () => {
      toast.success(t('platform.adminCredentialsUpdated'));
      qc.invalidateQueries({ queryKey: ['platform', 'org', id] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const o = orgQ.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/platform/organizations">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{o?.legalName ?? t('common.loading')}</h1>
          {o ? (
            <p className="font-mono text-sm text-muted-foreground">
              {o.slug} · {t(`platform.${o.status}`)}
            </p>
          ) : null}
        </div>
      </header>

      {orgQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : orgQ.isError ? (
        <p className="text-sm text-destructive">{(orgQ.error as Error).message}</p>
      ) : o ? (
        <>
          <OrgContactCard org={o} t={t} />
          <OrgAdminsCard
            org={o}
            t={t}
            resetMut={resetMut}
            updateMut={updateMut}
            useCustom={useCustom}
            setUseCustom={setUseCustom}
            customPassword={customPassword}
            setCustomPassword={setCustomPassword}
          />
          {resetResult ? (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base">{t('platform.oneTimePasswordTitle')}</CardTitle>
                <CardDescription>{t('platform.oneTimePasswordHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 font-mono text-sm">
                <p>
                  <span className="text-muted-foreground">{t('platform.adminEmail')}:</span> {resetResult.email}
                </p>
                <p>
                  <span className="text-muted-foreground">{t('platform.newPassword')}:</span>{' '}
                  <strong>{resetResult.password}</strong>
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setResetResult(null)}>
                  {t('common.cancel')}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function OrgContactCard({ org, t }: { org: PlatformOrgDetail; t: (k: string) => string }) {
  const location = org.mainDepartment
    ? [org.mainDepartment.region, org.mainDepartment.city].filter(Boolean).join(' · ')
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          {t('platform.orgContact')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field icon={<Mail className="h-3.5 w-3.5" />} label={t('platform.orgEmail')}>
            {org.email ?? <span className="text-muted-foreground">—</span>}
          </Field>
          <Field icon={<Phone className="h-3.5 w-3.5" />} label={t('platform.orgPhone')}>
            {org.phone ?? <span className="text-muted-foreground">—</span>}
          </Field>
          <Field icon={<MapPin className="h-3.5 w-3.5" />} label={t('platform.orgAddress')} className="sm:col-span-2">
            {org.address ?? <span className="text-muted-foreground">—</span>}
          </Field>
          {location ? (
            <Field icon={<MapPin className="h-3.5 w-3.5" />} label={t('platform.mainDeptLocation')} className="sm:col-span-2">
              {location}
              {org.mainDepartment?.name ? (
                <span className="ms-2 text-muted-foreground">({org.mainDepartment.name})</span>
              ) : null}
            </Field>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function OrgAdminsCard({
  org,
  t,
  resetMut,
  updateMut,
  useCustom,
  setUseCustom,
  customPassword,
  setCustomPassword,
}: {
  org: PlatformOrgDetail;
  t: (k: string) => string;
  resetMut: ReturnType<typeof useMutation<unknown, Error, { userId: string; newPassword?: string }>>;
  updateMut: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        userId: string;
        email: string;
        fullName: string;
        phone: string;
        locale: 'ar' | 'fr' | 'en';
        newPassword?: string;
      }
    >
  >;
  useCustom: boolean;
  setUseCustom: (v: boolean) => void;
  customPassword: string;
  setCustomPassword: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User2 className="h-4 w-4" />
          {t('platform.orgAdmins')}
        </CardTitle>
        <CardDescription>{t('platform.orgAdminsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {org.admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          org.admins.map((admin) => (
            <OrgAdminPanel
              key={admin.id}
              admin={admin}
              orgDefaultLanguage={org.defaultLanguage as 'ar' | 'fr' | 'en'}
              t={t}
              resetMut={resetMut}
              updateMut={updateMut}
              useCustom={useCustom}
              setUseCustom={setUseCustom}
              customPassword={customPassword}
              setCustomPassword={setCustomPassword}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OrgAdminPanel({
  admin,
  orgDefaultLanguage,
  t,
  resetMut,
  updateMut,
  useCustom,
  setUseCustom,
  customPassword,
  setCustomPassword,
}: {
  admin: PlatformOrgDetail['admins'][number];
  orgDefaultLanguage: 'ar' | 'fr' | 'en';
  t: (k: string) => string;
  resetMut: ReturnType<typeof useMutation<unknown, Error, { userId: string; newPassword?: string }>>;
  updateMut: ReturnType<
    typeof useMutation<
      unknown,
      Error,
      {
        userId: string;
        email: string;
        fullName: string;
        phone: string;
        locale: 'ar' | 'fr' | 'en';
        newPassword?: string;
      }
    >
  >;
  useCustom: boolean;
  setUseCustom: (v: boolean) => void;
  customPassword: string;
  setCustomPassword: (v: string) => void;
}) {
  const [email, setEmail] = useState(admin.email);
  const [fullName, setFullName] = useState(admin.fullName);
  const [phone, setPhone] = useState(admin.phone ?? '');
  const [locale, setLocale] = useState<'ar' | 'fr' | 'en'>(admin.locale ?? orgDefaultLanguage);
  const [credentialPassword, setCredentialPassword] = useState('');

  useEffect(() => {
    setEmail(admin.email);
    setFullName(admin.fullName);
    setPhone(admin.phone ?? '');
    setLocale(admin.locale ?? orgDefaultLanguage);
  }, [admin.email, admin.fullName, admin.phone, admin.locale, orgDefaultLanguage]);

  const credentialsDirty =
    email !== admin.email ||
    fullName !== admin.fullName ||
    (phone || '') !== (admin.phone ?? '') ||
    locale !== admin.locale ||
    credentialPassword.length > 0;

  return (
            <div className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{admin.fullName}</div>
                  <p className="flex items-center gap-1 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {admin.email}
                  </p>
                  {admin.phone ? (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {admin.phone}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={admin.status === 'active' ? 'success' : 'muted'}>{admin.status}</Badge>
                    {admin.mustChangePassword ? (
                      <Badge variant="warning">{t('platform.mustChangePassword')}</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium">{t('platform.updateAdminCredentials')}</p>
                <p className="text-xs text-muted-foreground">{t('platform.updateAdminCredentialsHint')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`admin-email-${admin.id}`}>{t('platform.adminEmail')}</Label>
                    <Input
                      id={`admin-email-${admin.id}`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`admin-name-${admin.id}`}>{t('platform.adminFullName')}</Label>
                    <Input
                      id={`admin-name-${admin.id}`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`admin-phone-${admin.id}`}>{t('platform.adminPhone')}</Label>
                    <PhoneInput
                      id={`admin-phone-${admin.id}`}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`admin-locale-${admin.id}`}>{t('platform.adminLocale')}</Label>
                    <select
                      id={`admin-locale-${admin.id}`}
                      className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as 'ar' | 'fr' | 'en')}
                    >
                      <option value="ar">العربية</option>
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor={`admin-pwd-update-${admin.id}`}>{t('platform.newPassword')}</Label>
                    <Input
                      id={`admin-pwd-update-${admin.id}`}
                      type="text"
                      autoComplete="new-password"
                      value={credentialPassword}
                      onChange={(e) => setCredentialPassword(e.target.value)}
                      placeholder={t('common.optional')}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    updateMut.isPending ||
                    !credentialsDirty ||
                    !email.trim() ||
                    fullName.trim().length < 2 ||
                    (credentialPassword.length > 0 && credentialPassword.length < 12)
                  }
                  onClick={() => {
                    let phonePayload: string | null = null;
                    try {
                      phonePayload = phone.trim() ? (phoneOptionalFromInput(phone) ?? null) : null;
                    } catch {
                      toast.error(t('validation.phone8Digits'));
                      return;
                    }
                    updateMut.mutate(
                      {
                        userId: admin.id,
                        email: email.trim(),
                        fullName: fullName.trim(),
                        phone: phonePayload,
                        locale,
                        ...(credentialPassword ? { newPassword: credentialPassword } : {}),
                      },
                      {
                        onSuccess: () => setCredentialPassword(''),
                      },
                    );
                  }}
                >
                  {updateMut.isPending ? t('common.loading') : t('platform.saveAdminCredentials')}
                </Button>
              </div>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium">{t('platform.resetAdminPassword')}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                  />
                  {t('platform.setCustomPassword')}
                </label>
                {useCustom ? (
                  <div>
                    <Label htmlFor={`pwd-${admin.id}`}>{t('platform.newPassword')}</Label>
                    <Input
                      id={`pwd-${admin.id}`}
                      type="text"
                      autoComplete="new-password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="min. 12 characters"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('platform.generatePasswordHint')}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resetMut.isPending || (useCustom && customPassword.length < 12)}
                  onClick={() =>
                    resetMut.mutate({
                      userId: admin.id,
                      newPassword: useCustom ? customPassword : undefined,
                    })
                  }
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {resetMut.isPending ? t('common.loading') : t('platform.resetPasswordButton')}
                </Button>
              </div>
            </div>
  );
}

function Field({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
