import type { EventNote, LifecycleStatus, MarketEvent } from "../domain/types";

/**
 * An event only becomes OBSERVED when there is evidence of an outcome: reported facts or a
 * price window. A released event with neither is DATA_UNAVAILABLE, never a "completed outcome".
 */
export function lifecycleOf(
  event: MarketEvent,
  hasPriceObservation: boolean,
  note: EventNote | undefined,
): LifecycleStatus {
  if (event.status !== "RELEASED") return "UPCOMING";
  if (!event.actuals && !hasPriceObservation) return "DATA_UNAVAILABLE";
  return note?.reviewedAt ? "REVIEWED" : "OBSERVED";
}
