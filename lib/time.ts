export const DISPLAY_TZ = "Asia/Kolkata";
/** NSE/BSE cash-market close, used to anchor daily closes in time. */
export const MARKET_CLOSE_IST = "15:30:00+05:30";

const DAY_MS = 86_400_000;

/** Calendar date (YYYY-MM-DD) of an instant in IST. */
export function istDate(at: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TZ }).format(new Date(at));
}

/** Moves a YYYY-MM-DD date by n weekdays (Sat/Sun skipped; exchange holidays are not modelled). */
export function addBusinessDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const step = n < 0 ? -1 : 1;
  // Land on a weekday first so offset 0 never returns a weekend.
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + step);
  for (let left = Math.abs(n); left > 0; ) {
    d.setUTCDate(d.getUTCDate() + step);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

export function closeInstant(date: string): string {
  return `${date}T${MARKET_CLOSE_IST}`;
}

/** Whole calendar days from `from` to `to` in IST; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${istDate(from)}T00:00:00Z`);
  const b = Date.parse(`${istDate(to)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}
