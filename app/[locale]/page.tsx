import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HeartHandshake, ShieldCheck, ScrollText } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getPostLoginPath } from '@/lib/auth-routes';
import { getCurrentUser } from '@/lib/session';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: getPostLoginPath(user), locale: locale as 'ar' | 'fr' | 'en' });
  }

  return <LandingInner />;
}

function LandingInner() {
  const t = useTranslations();
  return (
    <main className="flex-1">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary hover:opacity-90">
            {t('app.name')}
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t('auth.login')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register-donor">{t('auth.registerDonor')}</Link>
            </Button>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t('app.name')}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t('app.tagline')}</p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link href="/login">{t('auth.login')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register-donor">{t('auth.registerDonor')}</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <Feature icon={<HeartHandshake className="h-5 w-5" />} title={t('nav.beneficiaries')}>
              Structured PP files with workflow, re-verification, and consent management.
            </Feature>
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Security first">
              Per-tenant encryption, Row-Level Security, audit hash chain, 2FA.
            </Feature>
            <Feature icon={<ScrollText className="h-5 w-5" />} title={t('nav.bills')}>
              Tax-ready receipts, gap-free numbering, designer-friendly templates.
            </Feature>
          </div>
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Jam3iya
      </footer>
    </main>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{children}</p>
        </div>
      </CardContent>
    </Card>
  );
}
