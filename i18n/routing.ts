import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'fr', 'en'] as const,
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
});

export type AppLocale = (typeof routing.locales)[number];

export const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(['ar']);

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale as AppLocale);
}
