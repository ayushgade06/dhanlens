// Domain contracts. Timestamps are ISO-8601 strings with an explicit offset; display is Asia/Kolkata.

export type LinkType = "DIRECT" | "SECTOR" | "MACRO";
export type EventType = "EARNINGS" | "CORPORATE_ACTION" | "SECTOR" | "MACRO";
export type EventStatus = "SCHEDULED" | "RELEASED" | "POSTPONED" | "CANCELLED" | "UNKNOWN";
export type Importance = "HIGH" | "MEDIUM" | "LOW";
/** Confidence in the *relationship*, never in a price outcome. */
export type Confidence = "VERIFIED" | "CURATED" | "HYPOTHESIS";

export interface EvidenceReference {
  id: string;
  label: string;
  publisher: string;
  /** Absent for demo sources: we never invent a URL. */
  url?: string;
  publishedAt: string;
  retrievedAt: string;
  excerpt?: string;
  evidenceType: "FILING" | "PUBLICATION" | "TAXONOMY" | "CURATED_RULE" | "DEMO";
  isPrimarySource: boolean;
}

export interface EventActuals {
  summary: string;
  facts: string[];
  source: EvidenceReference;
}

export interface MarketEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  startsAt: string;
  endsAt?: string;
  /** Timezone the source published the schedule in. */
  timezone: string;
  status: EventStatus;
  importance: Importance;
  publisher: string;
  sourceUrl?: string;
  publishedAt: string;
  updatedAt: string;
  isIllustrative: boolean;
  /** Verified facts only. */
  known: string[];
  uncertain: string[];
  /** Neutral observation prompts; never trade advice. */
  suggestedWatchItems: string[];
  actuals?: EventActuals;
}

export interface Instrument {
  id: string;
  symbol: string;
  displayName: string;
  exchange: string;
  sector: string;
  industry?: string;
  securityId?: string;
  metadataSource: string;
  metadataUpdatedAt: string;
}

export interface PortfolioPosition {
  instrumentId: string;
  /** Kept on the position so unmapped live holdings still render. */
  symbol: string;
  quantity: number;
  averagePrice: number;
  lastPrice?: number;
  dataSource: string;
  asOf: string;
  isIllustrative: boolean;
}

export interface WatchlistEntry {
  instrumentId: string;
  listName: string;
  addedAt: string;
}

export type LinkTarget =
  | { kind: "instrument"; instrumentId: string }
  | { kind: "sector"; sector: string };

/** A curated relationship between an event and an issuer or sector. */
export interface EventLink {
  id: string;
  eventId: string;
  target: LinkTarget;
  linkType: LinkType;
  /** Short name of the evidence / transmission channel. */
  channel: string;
  rationale: string;
  /** The mapping logic that produced this link, in plain language. */
  rule: string;
  evidence: EvidenceReference[];
  confidence: Confidence;
  isHumanCurated: boolean;
}

export type Relation = "HELD" | "WATCHLIST";

export interface Exposure {
  value: number;
  /** Share of total portfolio value, 0..1. */
  weight: number;
  /** MARKET when a last price exists, COST when valued at average cost. */
  basis: "MARKET" | "COST";
  /** MEASURED only for a direct link to a held position; INDIRECT is the position value, not an event exposure. */
  kind: "MEASURED" | "INDIRECT";
}

/** An event resolved onto one of the user's instruments. */
export interface EventPortfolioLink {
  eventId: string;
  instrumentId: string;
  /** Strongest link reaching this instrument. */
  linkId: string;
  linkType: LinkType;
  /** Weaker links that reach the same instrument. */
  alsoViaLinkIds: string[];
  relation: Relation;
  exposure?: Exposure;
  asOf: string;
}

export interface PriceBar {
  /** Trading date, YYYY-MM-DD (IST). */
  date: string;
  close: number;
}

export interface PriceSeries {
  instrumentId: string;
  label: string;
  bars: PriceBar[];
  source: string;
  asOf: string;
  isSimulated: boolean;
  /** Whether closes are adjusted for corporate actions; affects comparability. */
  adjusted: boolean;
}

export interface EventOutcomeData {
  eventId: string;
  benchmark: PriceSeries;
  series: PriceSeries[];
}

export type WindowKind = "FIRST_CLOSE" | "NEXT_CLOSE";

export interface EventObservation {
  instrumentId: string;
  label: string;
  window: WindowKind;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  /** Percent. */
  absoluteReturn: number;
  /** Percent; null when the benchmark has no matching window. */
  benchmarkReturn: number | null;
  /** Percentage points; null when benchmarkReturn is null. */
  relativeReturn: number | null;
  limitation?: string;
  source: string;
  asOf: string;
  isSimulated: boolean;
}

export type LifecycleStatus = "UPCOMING" | "OBSERVED" | "REVIEWED" | "DATA_UNAVAILABLE";

export interface WatchItem {
  id: string;
  label: string;
  done: boolean;
}

export interface EventNote {
  eventId: string;
  createdAt: string;
  updatedAt: string;
  preEventNote: string;
  /** Previous versions of the pre-event note, newest first. */
  noteHistory: { note: string; at: string }[];
  watchItems: WatchItem[];
  reflection: string;
  reviewedAt?: string;
  /** True for the note shipped with the demo dataset. */
  isSeed?: boolean;
}

export type ProviderStatus =
  | "demo"
  | "live"
  | "stale"
  | "partial"
  | "unauthenticated"
  | "unavailable";

export interface PortfolioState {
  /** What the visible positions actually are. */
  mode: "demo" | "dhan";
  status: ProviderStatus;
  asOf: string;
  lastSuccessfulSync?: string;
  /** User-safe explanation; never contains credentials. */
  message?: string;
}

/** Everything a screen needs, already validated. Serialisable. */
export interface Snapshot {
  generatedAt: string;
  portfolio: PortfolioState;
  positions: PortfolioPosition[];
  watchlist: WatchlistEntry[];
  instruments: Instrument[];
  events: MarketEvent[];
  links: EventLink[];
  outcomes: EventOutcomeData[];
  seedNotes: EventNote[];
}
