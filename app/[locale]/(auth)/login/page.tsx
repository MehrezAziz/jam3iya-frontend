'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { departmentLogin, login } from '@/lib/api/auth';

const staffSchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});

const deptSchema = z.object({
  organizationSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8),
});

type StaffForm = z.infer<typeof staffSchema>;
type DeptForm = z.infer<typeof deptSchema>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [mode, setMode] = useState<'staff' | 'department'>('staff');
  const [needs2fa, setNeeds2fa] = useState(false);
  const staffForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { organizationSlug: 'demo', email: '', password: '' },
  });
  const deptForm = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { organizationSlug: 'demo', email: '', password: '' },
  });

  async function onStaffSubmit(values: StaffForm) {
    try {
      const result = await login(values);
      if ('needsTwoFactor' in result) {
        setNeeds2fa(true);
        toast.info(t('auth.twoFactorPrompt'));
        return;
      }
      const dest = result.user.kind === 'donor' ? '/me/donations' : '/dashboard';
      router.push(dest);
    } catch (err) {
      toast.error((err as Error).message || t('auth.loginError'));
    }
  }

  async function onDeptSubmit(values: DeptForm) {
    try {
      await departmentLogin(values);
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as Error).message || t('auth.loginError'));
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button type="button" size="sm" variant={mode === 'staff' ? 'default' : 'outline'} onClick={() => setMode('staff')}>
            {t('auth.staffLogin')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'department' ? 'default' : 'outline'}
            onClick={() => setMode('department')}
          >
            {t('auth.departmentLogin')}
          </Button>
        </div>
        {mode === 'staff' ? (
          <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="organizationSlug">{t('auth.organizationSlug')}</Label>
              <Input id="organizationSlug" autoComplete="organization" {...staffForm.register('organizationSlug')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...staffForm.register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" autoComplete="current-password" {...staffForm.register('password')} />
            </div>
            {needs2fa && (
              <div className="space-y-1.5">
                <Label htmlFor="twoFactorCode">{t('auth.twoFactorCode')}</Label>
                <Input
                  id="twoFactorCode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  {...staffForm.register('twoFactorCode')}
                />
                <p className="text-xs text-muted-foreground">{t('auth.twoFactorPrompt')}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={staffForm.formState.isSubmitting}>
              {staffForm.formState.isSubmitting ? t('common.loading') : t('auth.login')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccountYet')}{' '}
              <Link className="text-primary underline" href="/register-donor">
                {t('auth.registerDonor')}
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-org">{t('auth.organizationSlug')}</Label>
              <Input id="dept-org" autoComplete="organization" {...deptForm.register('organizationSlug')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-email">{t('auth.email')}</Label>
              <Input id="dept-email" type="email" autoComplete="email" {...deptForm.register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dept-password">{t('auth.password')}</Label>
              <Input id="dept-password" type="password" autoComplete="current-password" {...deptForm.register('password')} />
            </div>
            <Button type="submit" className="w-full" disabled={deptForm.formState.isSubmitting}>
              {deptForm.formState.isSubmitting ? t('common.loading') : t('auth.departmentLogin')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
