'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter, Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { registerDonor } from '@/lib/api/auth';

const schema = z.object({
  organizationSlug: z.string().min(1).max(80),
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  pseudo: z.string().max(80).optional(),
  fiscalId: z.string().max(80).optional(),
  password: z.string().min(12),
});

type FormData = z.infer<typeof schema>;

export default function RegisterDonorPage() {
  const t = useTranslations();
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { organizationSlug: 'demo' },
  });

  async function onSubmit(values: FormData) {
    try {
      await registerDonor({ ...values, locale: 'ar' });
      toast.success(t('common.successCreated'));
      router.push('/me/donations');
    } catch (err) {
      toast.error((err as Error).message || t('common.error'));
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.registerDonor')}</CardTitle>
        <CardDescription>{t('auth.registerDonorSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label={t('auth.organizationSlug')} {...form.register('organizationSlug')} />
          <Field label={t('auth.fullName')} {...form.register('fullName')} autoComplete="name" />
          <Field label={t('auth.email')} type="email" autoComplete="email" {...form.register('email')} />
          <Field label={t('auth.phone')} type="tel" autoComplete="tel" {...form.register('phone')} />
          <Field label={t('auth.pseudo')} {...form.register('pseudo')} />
          <Field label={t('donations.donorFiscalId')} {...form.register('fiscalId')} />
          <Field
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('common.loading') : t('auth.registerDonor')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link className="text-primary underline" href="/login">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.name as string}>{label}</Label>
      <Input id={props.name as string} {...props} />
    </div>
  );
}
