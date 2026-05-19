/**
 * The backend stores every amount in minor units (millimes for TND).
 * The UI always shows and accepts amounts in major units (dinars).
 * These helpers keep the conversion in one place.
 *
 * TND is configured to 3 decimal places.
 */
export const DEFAULT_CURRENCY = 'TND';

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
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${currency}`;
}

export function formatTnd(tnd: number | string, currency: string = DEFAULT_CURRENCY): string {
  const n = typeof tnd === 'string' ? Number(tnd) : tnd;
  if (!Number.isFinite(n)) return `0.000 ${currency}`;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${currency}`;
}
