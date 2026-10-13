import { DISPLAY_TZ, daysBetween } from "./time";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: DISPLAY_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatINR = (n: number) => inr.format(n);
export const formatINRWhole = (n: number) => inrWhole.format(n);
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} IST`;
/** Accepts an instant or a bare YYYY-MM-DD trading date. */
export const formatDate = (iso: string) =>
  dateOnly.format(new Date(iso.length === 10 ? `${iso}T12:00:00+05:30` : iso));

const signed = (n: number, digits: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;
export const formatPercent = (n: number) => `${signed(n, 2)}%`;
/** Percentage points — the unit of a difference between two percentages. */
export const formatPoints = (n: number) => `${signed(n, 2)} pp`;
export const formatWeight = (w: number) => `${(w * 100).toFixed(1)}%`;

export function formatRelativeDay(now: string, at: string): string {
  const d = daysBetween(now, at);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}
