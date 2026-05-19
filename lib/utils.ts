import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTndMinor(amountMinor: number | string | bigint, locale = 'fr-TN'): string {
  const num = typeof amountMinor === 'bigint' ? Number(amountMinor) : Number(amountMinor);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
  }).format(num / 1000);
}

export function formatGregorianAndHijri(value: string | Date, locale: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const gregorian = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
  try {
    const hijri = new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
    return `${gregorian}  •  ${hijri}`;
  } catch {
    return gregorian;
  }
}
