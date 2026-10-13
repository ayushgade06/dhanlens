import type { EventOutcomeData, PriceSeries } from "../lib/domain/types";
import { BENCHMARK } from "./demo-instruments";
import { DEMO_SOURCE, type DemoClock } from "./demo-clock";

// Simulated daily closes around the completed demo event. Invented numbers, not market data.
const OFFSETS = [-8, -7, -6, -5, -4, -3];

const closes: Record<string, { label: string; closes: number[] }> = {
  HDFCBANK: { label: "HDFCBANK", closes: [1600, 1608, 1596, 1628, 1640, 1622] },
  ICICIBANK: { label: "ICICIBANK", closes: [1200, 1204, 1198, 1207, 1210, 1203] },
  [BENCHMARK.id]: { label: BENCHMARK.label, closes: [25000, 25060, 24980, 25040, 25110, 25010] },
};

export function demoOutcomes(clock: DemoClock): EventOutcomeData[] {
  const series = (instrumentId: string): PriceSeries => ({
    instrumentId,
    label: closes[instrumentId].label,
    bars: OFFSETS.map((offset, i) => ({ date: clock.day(offset), close: closes[instrumentId].closes[i] })),
    source: `${DEMO_SOURCE} — simulated closes`,
    asOf: clock.at(-3, "15:30"),
    isSimulated: true,
    adjusted: true,
  });
  return [
    {
      eventId: "evt-hdfcbank-results",
      benchmark: series(BENCHMARK.id),
      series: [series("HDFCBANK"), series("ICICIBANK")],
    },
  ];
}
