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
import { login } from '@/lib/api/auth';

const schema = z.object({
  organizationSlug: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [needs2fa, setNeeds2fa] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { organizationSlug: 'demo', email: '', password: '' },
  });

  async function onSubmit(values: FormData) {
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

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="organizationSlug">{t('auth.organizationSlug')}</Label>
            <Input id="organizationSlug" autoComplete="organization" {...form.register('organizationSlug')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
          </div>
          {needs2fa && (
            <div className="space-y-1.5">
              <Label htmlFor="twoFactorCode">{t('auth.twoFactorCode')}</Label>
              <Input
                id="twoFactorCode"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                {...form.register('twoFactorCode')}
              />
              <p className="text-xs text-muted-foreground">{t('auth.twoFactorPrompt')}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('common.loading') : t('auth.login')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccountYet')}{' '}
            <Link className="text-primary underline" href="/register-donor">
              {t('auth.registerDonor')}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
