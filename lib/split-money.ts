import { tndToMinor } from '@/lib/money';

/** Split millimes equally; remainder distributed one millime at a time to first rows. */
export function splitMinorEqually(totalMinor: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function minorToTndAmount(minor: number): string {
  return String(minor / 1000);
}

export function tndAmountToMinor(tnd: string | number): number {
  const n = typeof tnd === 'string' ? Number(tnd) : tnd;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return tndToMinor(n);
}

/** After editing one row, distribute remaining millimes equally among other rows. */
export function redistributeSplitAmounts<T extends { id: string; amountTnd: string }>(
  totalMinor: number,
  rows: T[],
  editedId: string,
  editedAmountTnd: string,
): T[] {
  const editedMinor = Math.min(totalMinor, Math.max(0, tndAmountToMinor(editedAmountTnd)));
  const others = rows.filter((r) => r.id !== editedId);
  if (others.length === 0) {
    return rows.map((r) =>
      r.id === editedId ? { ...r, amountTnd: minorToTndAmount(totalMinor) } : r,
    );
  }
  const remaining = Math.max(0, totalMinor - editedMinor);
  const parts = splitMinorEqually(remaining, others.length);
  let oi = 0;
  return rows.map((r) => {
    if (r.id === editedId) return { ...r, amountTnd: minorToTndAmount(editedMinor) };
    const next = { ...r, amountTnd: minorToTndAmount(parts[oi] ?? 0) };
    oi += 1;
    return next;
  });
}

export function applyEqualSplits<T extends { id: string; amountTnd: string }>(
  rows: T[],
  totalMinor: number,
): T[] {
  if (rows.length === 0 || totalMinor <= 0) return rows;
  const parts = splitMinorEqually(totalMinor, rows.length);
  return rows.map((r, i) => ({ ...r, amountTnd: minorToTndAmount(parts[i] ?? 0) }));
}
