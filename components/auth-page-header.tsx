'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

/** Shared header for login and donor sign-up — brand links to the public welcome page. */
export function AuthPageHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{t('app.name')}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
