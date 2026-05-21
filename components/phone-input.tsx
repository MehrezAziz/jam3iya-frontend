'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { normalizePhoneInput, PHONE_DIGIT_COUNT } from '@/lib/phone';
import { cn } from '@/lib/utils';

/** Tunisia local mobile: exactly 8 digits (e.g. 21838888). */
export function PhoneInput({ className, onChange, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      maxLength={PHONE_DIGIT_COUNT}
      className={cn(className)}
      onChange={(e) => {
        const normalized = normalizePhoneInput(e.target.value);
        if (e.target.value !== normalized) {
          e.target.value = normalized;
        }
        onChange?.(e);
      }}
      {...props}
    />
  );
}
