import { z } from 'zod';

export const PHONE_DIGIT_COUNT = 8;

/** Keep only digits, max 8 (Tunisia local mobile without country code). */
export function normalizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_DIGIT_COUNT);
}

export function isValidPhone8(digits: string): boolean {
  return /^\d{8}$/.test(digits);
}

export const optionalPhoneSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((s) => {
    const digits = normalizePhoneInput(s ?? '');
    return digits.length > 0 ? digits : undefined;
  })
  .refine((v) => v === undefined || isValidPhone8(v), {
    message: 'Phone must be exactly 8 digits',
  });

export const requiredPhoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .transform((s) => normalizePhoneInput(s))
  .refine((v) => isValidPhone8(v), {
    message: 'Phone must be exactly 8 digits',
  });

export function phoneOptionalFromInput(raw: string): string | undefined {
  const digits = normalizePhoneInput(raw);
  if (!digits) return undefined;
  if (!isValidPhone8(digits)) {
    throw new Error('Phone must be exactly 8 digits');
  }
  return digits;
}
