'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Languages } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const LOCALE_OPTIONS: { value: AppLocale; labelKey: 'locale.ar' | 'locale.en' | 'locale.fr' }[] = [
  { value: 'ar', labelKey: 'locale.ar' },
  { value: 'en', labelKey: 'locale.en' },
  { value: 'fr', labelKey: 'locale.fr' },
];

type LanguageSwitcherProps = {
  className?: string;
  /** Icon button with dropdown (header). */
  variant?: 'dropdown';
};

export function LanguageSwitcher({ className, variant = 'dropdown' }: LanguageSwitcherProps) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  function select(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (variant !== 'dropdown') return null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5"
        aria-label={t('locale.selectLanguage')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden text-xs font-medium sm:inline">{t(`locale.${locale}`)}</span>
      </Button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('locale.selectLanguage')}
          className="absolute end-0 z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-background py-1 shadow-md"
        >
          {LOCALE_OPTIONS.map((opt) => {
            const active = opt.value === locale;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted',
                    active && 'bg-primary/5 text-primary',
                  )}
                  onClick={() => select(opt.value)}
                >
                  <span>{t(opt.labelKey)}</span>
                  {active ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function LanguageOptionList({
  className,
  compact = false,
}: {
  className?: string;
  /** Compact inline pills (settings page). */
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ul
      className={cn(
        compact ? 'inline-flex flex-wrap items-center gap-1.5' : 'grid gap-1 sm:grid-cols-3',
        className,
      )}
      role="listbox"
      aria-label={t('locale.selectLanguage')}
    >
      {LOCALE_OPTIONS.map((opt) => {
        const active = opt.value === locale;
        return (
          <li key={opt.value} role="option" aria-selected={active}>
            <Button
              type="button"
              variant={active ? 'default' : 'outline'}
              size={compact ? 'sm' : 'default'}
              className={cn(
                compact ? 'h-8 min-w-0 px-2.5 text-xs' : 'w-full justify-center',
              )}
              onClick={() => {
                if (opt.value !== locale) router.replace(pathname, { locale: opt.value });
              }}
            >
              {t(opt.labelKey)}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
