'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Date input with an always-visible calendar icon button.
 * Falls back to the native date picker on every browser, but the icon
 * gives clear visual affordance and works with manual typing too.
 *
 * The value/onChange contract is identical to a regular `<input type="date">`.
 */
export const DateInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type: _ignored, ...props }, ref) => {
  const localRef = React.useRef<HTMLInputElement | null>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLInputElement);

  function openPicker() {
    const el = localRef.current;
    if (!el) return;
    // showPicker() exists on modern browsers (Chrome, Edge, Safari 16+, FF >=99)
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
        ref={localRef}
        type="date"
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 ps-3 pe-10 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
          className,
        )}
        {...props}
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
