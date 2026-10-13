import type {
  EventLink,
  EventOutcomeData,
  Instrument,
  MarketEvent,
  PortfolioPosition,
  PortfolioState,
  WatchlistEntry,
} from "../domain/types";

/** Holdings plus a truthful description of where they came from. */
export interface PortfolioResult {
  state: PortfolioState;
  positions: PortfolioPosition[];
  watchlist: WatchlistEntry[];
}

export interface PortfolioProvider {
  getPortfolio(): Promise<PortfolioResult>;
}

/** Independent of the broker: DhanHQ is not assumed to supply an event calendar. */
export interface EventProvider {
  listEvents(): Promise<{ events: MarketEvent[]; links: EventLink[] }>;
}

export interface MarketDataProvider {
  /** Daily bars around completed events; empty when none are available. */
  getOutcomeData(): Promise<EventOutcomeData[]>;
}

export interface InstrumentMetadataProvider {
  listInstruments(): Promise<Instrument[]>;
}
