'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Date input with an always-visible calendar icon button.
 * Falls back to the native date picker on every browser, but the icon
 * gives clear visual affordance and works with manual typing too.
 *
 * Works with react-hook-form `register()` (uncontrolled) and with an
 * explicit `value` prop (controlled). When `value` is omitted, the native
 * input manages its own display; when provided, `undefined` is coerced to ''.
 */
export const DateInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type: _ignored, value, ref: fieldRef, ...props }, forwardedRef) => {
  const localRef = React.useRef<HTMLInputElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof fieldRef === 'function') {
        fieldRef(node);
      } else if (fieldRef) {
        (fieldRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [fieldRef, forwardedRef],
  );

  function openPicker() {
    const el = localRef.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      try {
        (el as HTMLInputElement & { showPicker: () => void }).showPicker();
        return;
      } catch {
        // ignore — fallback to focus
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
        {...props}
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
});
DateInput.displayName = 'DateInput';
