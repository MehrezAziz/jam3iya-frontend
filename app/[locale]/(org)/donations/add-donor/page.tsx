'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createDonorAccount } from '@/lib/api/donors';

const schema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(8).max(40),
  password: z.string().min(12),
  email: z.string().email().optional().or(z.literal('')),
  fiscalId: z.string().max(80).optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddDonorPage() {
  const t = useTranslations();
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '', password: '', email: '', fiscalId: '' },
  });

  async function onSubmit(values: FormData) {
    try {
      await createDonorAccount({
        fullName: values.fullName,
        phone: values.phone,
        password: values.password,
        email: values.email || undefined,
        fiscalId: values.fiscalId || undefined,
        acceptsTaxReceipt: true,
      });
      toast.success(t('donations.donorAccountCreated'));
      router.push('/donations');
    } catch (err) {
      toast.error((err as Error).message || t('common.error'));
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('donations.addDonator')}</h1>
        <p className="text-sm text-muted-foreground">{t('donations.addDonatorHint')}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t('donations.addDonator')}</CardTitle>
          <CardDescription>{t('donations.addDonatorHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('auth.fullName')} {...form.register('fullName')} autoComplete="name" />
            <Field label={t('auth.phone')} type="tel" {...form.register('phone')} autoComplete="tel" />
            <Field label={t('auth.email')} type="email" {...form.register('email')} autoComplete="email" />
            <Field label={t('donations.donorFiscalId')} {...form.register('fiscalId')} />
            <Field
              label={t('auth.password')}
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <p className="text-xs text-muted-foreground">{t('donations.donorLoginHint')}</p>
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('common.loading') : t('donations.createDonatorAccount')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/donations">{t('common.cancel')}</Link>
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
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
