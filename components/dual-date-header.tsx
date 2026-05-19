'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function formatDates(locale: string, date: Date) {
  const gregorian = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat(`${locale}-u-ca-islamic`, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    hijri = gregorian;
  }
  return { hijri, gregorian };
}

export function DualDateHeader({ className }: { className?: string }) {
  const locale = useLocale();
  const [dates, setDates] = useState<{ hijri: string; gregorian: string } | null>(null);

  useEffect(() => {
    setDates(formatDates(locale, new Date()));
  }, [locale]);

  return (
    <div className={cn('shrink-0 text-center leading-tight', className)} aria-live="polite">
      {dates ? (
        <>
          <div className="text-xs font-medium text-foreground sm:text-sm">{dates.hijri}</div>
          <div className="text-[10px] text-muted-foreground sm:text-xs">{dates.gregorian}</div>
        </>
      ) : (
        <div className="mx-auto h-8 w-24 animate-pulse rounded bg-muted" />
      )}
    </div>
  );
}
