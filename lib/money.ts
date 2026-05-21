/**
 * The backend stores every amount in minor units (millimes for TND).
 * The UI always shows and accepts amounts in major units (dinars).
 * These helpers keep the conversion in one place.
 *
 * Amounts are stored in millimes (3 decimals). The UI displays 1 decimal place (e.g. 9855,0 TND).
 */
export const DEFAULT_CURRENCY = 'TND';

const DISPLAY_FRACTION_DIGITS = 1;

export function tndToMinor(tnd: number | string): number {
  const n = typeof tnd === 'string' ? Number(tnd) : tnd;
  if (!Number.isFinite(n)) return 0;
  // round to avoid 49.999999999999 from floating point
  return Math.round(n * 1000);
}

export function minorToTnd(minor: number | bigint | string): number {
  const n = typeof minor === 'bigint' ? Number(minor) : typeof minor === 'string' ? Number(minor) : minor;
  if (!Number.isFinite(n)) return 0;
  return n / 1000;
}

export function formatMoney(minor: number | bigint | string, currency: string = DEFAULT_CURRENCY): string {
  const value = minorToTnd(minor);
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: DISPLAY_FRACTION_DIGITS,
    maximumFractionDigits: DISPLAY_FRACTION_DIGITS,
  })} ${currency}`;
}

export function formatTnd(tnd: number | string, currency: string = DEFAULT_CURRENCY): string {
  const n = typeof tnd === 'string' ? Number(tnd) : tnd;
  if (!Number.isFinite(n)) return `0,0 ${currency}`;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: DISPLAY_FRACTION_DIGITS,
    maximumFractionDigits: DISPLAY_FRACTION_DIGITS,
  })} ${currency}`;
}
