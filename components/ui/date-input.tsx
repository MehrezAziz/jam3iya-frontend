'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type DateInputProps = React.ComponentPropsWithoutRef<'input'>;

/**
 * Date input with an always-visible calendar icon button.
 * Works with react-hook-form `register()` (uncontrolled) and with an
 * explicit `value` prop (controlled).
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, type: _ignored, value, ...rest }, forwardedRef) => {
    const localRef = React.useRef<HTMLInputElement | null>(null);
    const registerRef = (rest as { ref?: React.Ref<HTMLInputElement> }).ref;
    const inputProps = { ...rest } as Record<string, unknown>;
    delete inputProps.ref;

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        localRef.current = node;
        if (typeof registerRef === 'function') {
          registerRef(node);
        } else if (registerRef) {
          (registerRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [registerRef, forwardedRef],
    );

    function openPicker() {
      const el = localRef.current;
      if (!el) return;
      if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
        try {
          (el as HTMLInputElement & { showPicker: () => void }).showPicker();
          return;
        } catch {
          // ignore
        }
      }
      el.focus();
    }

    return (
      <div className="relative">
        <input
          ref={setRefs}
          type="date"
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 ps-3 pe-10 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            className,
          )}
          {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
          {...(value !== undefined ? { value: value ?? '' } : {})}
        />
        <button
          type="button"
          onClick={openPicker}
          tabIndex={-1}
          aria-label="Open date picker"
          className="pointer-events-auto absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>
    );
  },
);
DateInput.displayName = 'DateInput';
