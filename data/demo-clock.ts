import { addBusinessDays, istDate } from "../lib/time";

/**
 * Demo fixtures are dated relative to "today" so the scenario always has upcoming and past
 * events. Offsets are in weekdays. These are scenario dates, not real market schedules.
 */
export interface DemoClock {
  now: string;
  /** IST instant `offset` weekdays from today at HH:mm. */
  at(offset: number, time: string): string;
  /** Trading date `offset` weekdays from today. */
  day(offset: number): string;
}

export function demoClock(now: Date): DemoClock {
  const today = istDate(now);
  const day = (offset: number) => addBusinessDays(today, offset);
  return { now: now.toISOString(), day, at: (offset, time) => `${day(offset)}T${time}:00+05:30` };
}

export const DEMO_SOURCE = "DhanLens illustrative demo dataset";
