import type { PortfolioPosition, WatchlistEntry } from "../lib/domain/types";
import { DEMO_SOURCE, type DemoClock } from "./demo-clock";

// Quantities and prices are round, invented numbers — not market prices.
const holdings: [symbol: string, quantity: number, averagePrice: number, lastPrice: number][] = [
  ["HDFCBANK", 40, 1500, 1620],
  ["TCS", 12, 3400, 3650],
  ["RELIANCE", 25, 2500, 2700],
  ["SUNPHARMA", 30, 1500, 1700],
  ["ASIANPAINT", 15, 2800, 2500],
  ["MARUTI", 4, 11000, 12000],
];

const watched = ["INFY", "ICICIBANK", "ONGC", "HINDUNILVR"];

export function demoPositions(clock: DemoClock): PortfolioPosition[] {
  return holdings.map(([symbol, quantity, averagePrice, lastPrice]) => ({
    instrumentId: symbol,
    symbol,
    quantity,
    averagePrice,
    lastPrice,
    dataSource: DEMO_SOURCE,
    asOf: clock.now,
    isIllustrative: true,
  }));
}

export function demoWatchlist(clock: DemoClock): WatchlistEntry[] {
  return watched.map((instrumentId) => ({
    instrumentId,
    listName: "Demo watchlist",
    addedAt: clock.at(-20, "09:15"),
  }));
}
