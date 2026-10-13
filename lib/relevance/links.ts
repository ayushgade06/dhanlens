import type {
  EventLink,
  EventPortfolioLink,
  Exposure,
  Instrument,
  LinkType,
  PortfolioPosition,
  Relation,
  WatchlistEntry,
} from "../domain/types";

export interface PortfolioContext {
  instruments: Instrument[];
  positions: PortfolioPosition[];
  watchlist: WatchlistEntry[];
  asOf: string;
}

export interface ResolvedEvent {
  /** Links that passed the rules, strongest first. */
  links: EventLink[];
  /** One row per user instrument reached, strongest link kept. */
  portfolioLinks: EventPortfolioLink[];
  /** Links dropped because they break a rule or cannot be mapped; shown, never silently applied. */
  rejected: { link: EventLink; reason: string }[];
}

const STRENGTH: Record<LinkType, number> = { DIRECT: 3, SECTOR: 2, MACRO: 1 };

export function positionValue(p: PortfolioPosition): { value: number; basis: Exposure["basis"] } {
  return p.lastPrice !== undefined
    ? { value: p.quantity * p.lastPrice, basis: "MARKET" }
    : { value: p.quantity * p.averagePrice, basis: "COST" };
}

export function portfolioValue(positions: PortfolioPosition[]): number {
  return positions.reduce((sum, p) => sum + positionValue(p).value, 0);
}

/** Why a link cannot be used, or null when it is valid. */
export function linkRuleViolation(link: EventLink, instruments: Map<string, Instrument>): string | null {
  if (link.target.kind === "instrument") {
    if (link.linkType !== "DIRECT")
      return `${link.linkType} links must target a sector, not an individual instrument.`;
    if (!instruments.has(link.target.instrumentId))
      return `No verified instrument mapping for "${link.target.instrumentId}".`;
    return null;
  }
  if (link.linkType === "DIRECT") return "Direct links require a verified issuer/instrument mapping.";
  return null;
}

/**
 * Resolves an event's curated links onto the user's holdings and watchlist.
 * Sector matching uses instrument metadata only — an instrument is in a sector because its
 * metadata says so, never because of an inference.
 */
export function resolveEvent(eventId: string, allLinks: EventLink[], ctx: PortfolioContext): ResolvedEvent {
  const instruments = new Map(ctx.instruments.map((i) => [i.id, i]));
  const held = new Map(ctx.positions.map((p) => [p.instrumentId, p]));
  const watched = new Set(ctx.watchlist.map((w) => w.instrumentId));
  const total = portfolioValue(ctx.positions);

  const links: EventLink[] = [];
  const rejected: ResolvedEvent["rejected"] = [];
  const seen = new Set<string>();
  for (const link of allLinks) {
    if (link.eventId !== eventId) continue;
    // The same relationship supplied twice (e.g. by two feeds) counts once.
    const key = `${link.linkType}|${link.target.kind === "instrument" ? link.target.instrumentId : `sector:${link.target.sector}`}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const reason = linkRuleViolation(link, instruments);
    if (reason) rejected.push({ link, reason });
    else links.push(link);
  }
  links.sort((a, b) => STRENGTH[b.linkType] - STRENGTH[a.linkType]);

  const byInstrument = new Map<string, EventPortfolioLink>();
  for (const link of links) {
    const target = link.target;
    const reached =
      target.kind === "instrument"
        ? [target.instrumentId]
        : ctx.instruments.filter((i) => i.sector === target.sector).map((i) => i.id);

    for (const instrumentId of reached) {
      const position = held.get(instrumentId);
      if (!position && !watched.has(instrumentId)) continue;

      const existing = byInstrument.get(instrumentId);
      if (existing) {
        // Links are sorted strongest-first, so the first one stays primary.
        existing.alsoViaLinkIds.push(link.id);
        continue;
      }
      const relation: Relation = position ? "HELD" : "WATCHLIST";
      let exposure: Exposure | undefined;
      if (position) {
        const { value, basis } = positionValue(position);
        exposure = {
          value,
          basis,
          weight: total > 0 ? value / total : 0,
          kind: link.linkType === "DIRECT" ? "MEASURED" : "INDIRECT",
        };
      }
      byInstrument.set(instrumentId, {
        eventId,
        instrumentId,
        linkId: link.id,
        linkType: link.linkType,
        alsoViaLinkIds: [],
        relation,
        exposure,
        asOf: position?.asOf ?? ctx.asOf,
      });
    }
  }

  const portfolioLinks = [...byInstrument.values()].sort(
    (a, b) =>
      STRENGTH[b.linkType] - STRENGTH[a.linkType] ||
      Number(b.relation === "HELD") - Number(a.relation === "HELD") ||
      (b.exposure?.value ?? 0) - (a.exposure?.value ?? 0),
  );
  return { links, portfolioLinks, rejected };
}
