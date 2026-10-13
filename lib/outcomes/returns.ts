import type { EventObservation, EventOutcomeData, PriceBar, PriceSeries, WindowKind } from "../domain/types";
import { closeInstant } from "../time";

/**
 * Return convention (one, used everywhere): simple close-to-close price return.
 *   start = last daily close strictly before the event's release time
 *   end   = first daily close at/after release (FIRST_CLOSE) or the close after that (NEXT_CLOSE)
 * These are price returns, not total returns: dividends are excluded and unadjusted closes can be
 * distorted by splits/bonuses. A return around an event is an observation, not causal attribution.
 */

/** Simple return in percent, or null when the prices cannot support a calculation. */
export function simpleReturn(startPrice: number, endPrice: number): number | null {
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startPrice <= 0 || endPrice < 0) return null;
  return ((endPrice - startPrice) / startPrice) * 100;
}

/** Instrument minus benchmark, in percentage points (not a ratio). */
export function relativeReturn(instrumentReturn: number, benchmarkReturn: number): number {
  return instrumentReturn - benchmarkReturn;
}

export interface PriceWindow {
  start: PriceBar;
  end: PriceBar;
}

export function findWindow(bars: PriceBar[], releasedAt: string, window: WindowKind): PriceWindow | null {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const release = Date.parse(releasedAt);
  if (Number.isNaN(release)) return null;
  const firstAfter = sorted.findIndex((b) => Date.parse(closeInstant(b.date)) >= release);
  if (firstAfter <= 0) return null; // no close after release, or no prior close
  const end = sorted[firstAfter + (window === "NEXT_CLOSE" ? 1 : 0)];
  return end ? { start: sorted[firstAfter - 1], end } : null;
}

export function observe(
  series: PriceSeries,
  benchmark: PriceSeries | undefined,
  releasedAt: string,
  window: WindowKind,
): EventObservation | null {
  const w = findWindow(series.bars, releasedAt, window);
  if (!w) return null;
  const absoluteReturn = simpleReturn(w.start.close, w.end.close);
  if (absoluteReturn === null) return null;

  let benchmarkReturn: number | null = null;
  let limitation: string | undefined;
  const bw = benchmark ? findWindow(benchmark.bars, releasedAt, window) : null;
  if (!benchmark || !bw) {
    limitation = "No benchmark data for this window; relative return not computed.";
  } else if (bw.start.date !== w.start.date || bw.end.date !== w.end.date) {
    // Never compare returns measured over different windows.
    limitation = "Benchmark window does not match the instrument window; relative return not computed.";
  } else {
    benchmarkReturn = simpleReturn(bw.start.close, bw.end.close);
    if (benchmarkReturn === null) limitation = "Benchmark prices are invalid; relative return not computed.";
  }
  if (!series.adjusted && !limitation)
    limitation = "Unadjusted closes: a split, bonus or dividend inside the window would distort this figure.";

  return {
    instrumentId: series.instrumentId,
    label: series.label,
    window,
    startDate: w.start.date,
    endDate: w.end.date,
    startPrice: w.start.close,
    endPrice: w.end.close,
    absoluteReturn,
    benchmarkReturn,
    relativeReturn: benchmarkReturn === null ? null : relativeReturn(absoluteReturn, benchmarkReturn),
    limitation,
    source: series.source,
    asOf: series.asOf,
    isSimulated: series.isSimulated || (benchmark?.isSimulated ?? false),
  };
}

export function observeOutcome(data: EventOutcomeData, releasedAt: string, window: WindowKind): EventObservation[] {
  return data.series.flatMap((s) => observe(s, data.benchmark, releasedAt, window) ?? []);
}

export const AGGREGATION_METHOD = "Equal-weighted arithmetic mean of the instruments shown (not position-weighted)";

/** Equal-weighted mean of absolute and relative returns; relative is null unless every row has one. */
export function aggregate(observations: EventObservation[]): { absolute: number; relative: number | null } | null {
  if (observations.length === 0) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const relatives = observations.map((o) => o.relativeReturn);
  return {
    absolute: mean(observations.map((o) => o.absoluteReturn)),
    relative: relatives.every((r): r is number => r !== null) ? mean(relatives) : null,
  };
}
