import { z } from 'zod';

export const PHONE_DIGIT_COUNT = 8;

/** Keep only digits, max 8 (Tunisia local mobile without country code). */
export function normalizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_DIGIT_COUNT);
}

export function isValidPhone8(digits: string): boolean {
  return /^\d{8}$/.test(digits);
}

/** Form field: always a string ('' = empty). Validates 8 digits when non-empty. */
export const optionalPhoneFormSchema = z
  .string()
  .transform((s) => normalizePhoneInput(s))
  .refine((digits) => digits.length === 0 || isValidPhone8(digits), {
    message: 'Phone must be exactly 8 digits',
  });

/** API payload: undefined when empty. */
export const optionalPhoneSchema = optionalPhoneFormSchema.transform((digits) =>
  digits.length > 0 ? digits : undefined,
);

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
