'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DayPicker } from 'react-day-picker';
import { ar, enUS, fr } from 'date-fns/locale';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import 'react-day-picker/style.css';

const LOCALE_MAP = { ar, en: enUS, fr } as const;

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function toIsoDate(d: Date | undefined): string {
  if (!d || !isValid(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emitChange(
  el: HTMLInputElement | null,
  onChange: React.ChangeEventHandler<HTMLInputElement> | undefined,
  iso: string,
) {
  if (!onChange) return;
  const event = {
    target: { value: iso, name: el?.name ?? '' },
    currentTarget: { value: iso, name: el?.name ?? '' },
  } as React.ChangeEvent<HTMLInputElement>;
  onChange(event);
}

export type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Earliest selectable year in the dropdown (default: current year − 100). */
  fromYear?: number;
  /** Latest selectable year in the dropdown (default: current year + 10). */
  toYear?: number;
};

/**
 * Calendar date picker with month and year dropdowns (no endless scroll).
 * Value is ISO `YYYY-MM-DD`. Compatible with react-hook-form `register()`.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      value,
      onChange,
      onBlur,
      disabled,
      id,
      name,
      fromYear,
      toYear,
      placeholder,
      ...rest
    },
    forwardedRef,
  ) => {
    const t = useTranslations('datePicker');
    const intlLocale = useLocale() as keyof typeof LOCALE_MAP;
    const dfLocale = LOCALE_MAP[intlLocale] ?? enUS;
    const hiddenRef = React.useRef<HTMLInputElement | null>(null);
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = React.useState(false);
    /** Keeps the trigger label in sync when used with react-hook-form `register()` (uncontrolled). */
    const [localValue, setLocalValue] = React.useState(value ?? '');

    const now = new Date();
    const startYear = fromYear ?? now.getFullYear() - 100;
    const endYear = toYear ?? now.getFullYear() + 10;
    const startMonth = new Date(startYear, 0, 1);
    const endMonth = new Date(endYear, 11, 31);

    const effectiveValue = value !== undefined ? value : localValue;

    React.useEffect(() => {
      if (value !== undefined) setLocalValue(value);
    }, [value]);

    const selected = parseIsoDate(effectiveValue);
    const display =
      selected && isValid(selected)
        ? format(selected, 'PPP', { locale: dfLocale })
        : '';

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        hiddenRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      if (!open) return;
      function onDocClick(e: MouseEvent) {
        const target = e.target as Node;
        if (panelRef.current?.contains(target)) return;
        setOpen(false);
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false);
      }
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('keydown', onKey);
      };
    }, [open]);

    function applyValue(iso: string) {
      setLocalValue(iso);
      if (hiddenRef.current) hiddenRef.current.value = iso;
      emitChange(hiddenRef.current, onChange, iso);
    }

    function selectDate(d: Date | undefined) {
      const iso = toIsoDate(d);
      applyValue(iso);
      if (d) setOpen(false);
    }

    function clearDate() {
      applyValue('');
      setOpen(false);
    }

    return (
      <div className={cn('relative', className)}>
        <input
          ref={setRefs}
          type="hidden"
          id={id}
          name={name}
          value={effectiveValue}
          disabled={disabled}
          onBlur={onBlur}
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange?.(e);
          }}
          {...rest}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-10 w-full justify-start px-3 text-start font-normal',
              !display && 'text-muted-foreground',
            )}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <Calendar className="me-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{display || placeholder || t('placeholder')}</span>
          </Button>
          {effectiveValue && !disabled ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={t('clear')}
              onClick={clearDate}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {open ? (
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('title')}
            className="jam3iya-date-picker absolute z-50 mt-1 rounded-md border border-border bg-background p-2 shadow-lg"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={selectDate}
              locale={dfLocale}
              captionLayout="dropdown"
              hideNavigation
              startMonth={startMonth}
              endMonth={endMonth}
              defaultMonth={selected ?? new Date(Math.min(endYear, now.getFullYear()), now.getMonth(), 1)}
              disabled={disabled}
              classNames={{
                root: 'rdp-root text-sm',
                month_caption: 'flex items-center justify-center py-1',
                dropdowns: 'flex items-center gap-4',
                day_button: 'h-9 w-9 rounded-md hover:bg-muted',
                selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                today: 'font-semibold text-primary',
              }}
            />
          </div>
        ) : null}
      </div>
    );
  },
);
DateInput.displayName = 'DateInput';
