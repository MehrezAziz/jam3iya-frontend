'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  className?: string;
  disabled?: boolean;
};

export function PinInput({ value, onChange, length = 4, className, disabled }: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  function commit(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, length));
  }

  function setAt(index: number, digit: string) {
    const next = [...chars];
    next[index] = digit;
    commit(next.join(''));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      setAt(index, '');
      return;
    }
    setAt(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[index]) {
      if (index > 0) {
        setAt(index - 1, '');
        refs.current[index - 1]?.focus();
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    commit(pasted);
    refs.current[Math.min(Math.max(pasted.length - 1, 0), length - 1)]?.focus();
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {chars.map((ch, i) => (
        <div
          key={i}
          className="relative h-12 w-12"
        >
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            className={cn(
              'h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold tabular-nums',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              ch ? 'text-transparent caret-transparent' : 'text-foreground',
            )}
            value={ch}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`PIN digit ${i + 1}`}
          />
          {ch ? (
            <span
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-2xl leading-none"
              aria-hidden
            >
              •
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
