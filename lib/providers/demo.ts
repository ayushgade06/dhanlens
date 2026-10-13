import { type DemoClock } from "../../data/demo-clock";
import { demoEvents, demoLinks } from "../../data/demo-events";
import { demoInstruments } from "../../data/demo-instruments";
import { demoOutcomes } from "../../data/demo-outcomes";
import { demoPositions, demoWatchlist } from "../../data/demo-portfolio";
import type {
  EventProvider,
  InstrumentMetadataProvider,
  MarketDataProvider,
  PortfolioProvider,
} from "./contracts";

export function demoProvider(
  clock: DemoClock,
): PortfolioProvider & EventProvider & MarketDataProvider & InstrumentMetadataProvider {
  return {
    async getPortfolio() {
      return {
        state: { mode: "demo", status: "demo", asOf: clock.now },
        positions: demoPositions(clock),
        watchlist: demoWatchlist(clock),
      };
    },
    async listEvents() {
      return { events: demoEvents(clock), links: demoLinks(clock) };
    },
    async getOutcomeData() {
      return demoOutcomes(clock);
    },
    async listInstruments() {
      return demoInstruments;
    },
  };
}
