'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  /** Value displayed to the user (in major units, i.e. TND). */
  value?: number | string;
  defaultValue?: number;
  currency?: string;
  /** Fired with the major-unit numeric value (e.g. 12.5 TND). */
  onValueChange?: (value: number) => void;
}

/**
 * Money input. The user always types and sees an amount in TND (e.g. "50.000").
 * Always renders a trailing read-only currency badge so the unit is unambiguous.
 *
 * To send to the backend, callers should use `tndToMinor(value)` from `lib/money`.
 */
export function MoneyInput({
  value,
  defaultValue,
  currency = 'TND',
  onValueChange,
  onBlur,
  className,
  step = '0.001',
  min = '0',
  inputMode = 'decimal',
  ...rest
}: MoneyInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        step={step as string}
        min={min as string}
        inputMode={inputMode}
        value={value as number | string | undefined}
        defaultValue={defaultValue}
        onChange={(e) => {
          if (onValueChange) {
            const raw = e.target.value;
            onValueChange(raw === '' ? 0 : Number(raw));
          }
        }}
        onBlur={onBlur}
        className={cn('pe-16', className)}
        {...rest}
      />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-medium uppercase text-muted-foreground">
        {currency}
      </span>
    </div>
  );
}
