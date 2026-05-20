import { z } from 'zod';

/** Keep only digits, max 8 (preserves leading zeros). */
export function normalizeCinInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8);
}

export const optionalCinSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((s) => {
    const digits = normalizeCinInput(s ?? '');
    return digits.length > 0 ? digits : undefined;
  })
  .refine((v) => v === undefined || /^\d{8}$/.test(v), {
    message: 'CIN must be exactly 8 digits',
  });

export const requiredCinSchema = z
  .string()
  .min(1, 'CIN is required')
  .transform((s) => normalizeCinInput(s))
  .refine((v) => /^\d{8}$/.test(v), {
    message: 'CIN must be exactly 8 digits',
  });
