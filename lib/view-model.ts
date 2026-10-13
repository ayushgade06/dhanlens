import type { EventLink, EventNote, Instrument, LifecycleStatus, MarketEvent, Snapshot } from "./domain/types";
import { lifecycleOf } from "./ledger/lifecycle";
import { resolveEvent, type ResolvedEvent } from "./relevance/links";
import { scoreEvent, type RelevanceScore } from "./relevance/score";

export interface EventView extends ResolvedEvent {
  event: MarketEvent;
  score: RelevanceScore;
  lifecycle: LifecycleStatus;
  note?: EventNote;
  heldCount: number;
  watchCount: number;
  /** True when at least one user instrument is reached by a DIRECT link. */
  hasDirect: boolean;
  hasIndirect: boolean;
}

/** The single place screens get ranked, resolved events from. */
export function buildEventViews(snapshot: Snapshot, notes: Record<string, EventNote>): EventView[] {
  const ctx = {
    instruments: snapshot.instruments,
    positions: snapshot.positions,
    watchlist: snapshot.watchlist,
    asOf: snapshot.portfolio.asOf,
  };
  const withOutcome = new Set(snapshot.outcomes.filter((o) => o.series.length > 0).map((o) => o.eventId));
  return snapshot.events.map((event) => {
    const resolved = resolveEvent(event.id, snapshot.links, ctx);
    const note = notes[event.id];
    return {
      ...resolved,
      event,
      note,
      score: scoreEvent(event, resolved.portfolioLinks, { now: snapshot.generatedAt, saved: Boolean(note) }),
      lifecycle: lifecycleOf(event, withOutcome.has(event.id), note),
      heldCount: resolved.portfolioLinks.filter((l) => l.relation === "HELD").length,
      watchCount: resolved.portfolioLinks.filter((l) => l.relation === "WATCHLIST").length,
      hasDirect: resolved.portfolioLinks.some((l) => l.linkType === "DIRECT"),
      hasIndirect: resolved.portfolioLinks.some((l) => l.linkType !== "DIRECT"),
    };
  });
}

export const isUpcoming = (v: EventView) => v.lifecycle === "UPCOMING";

export const byTime = (a: EventView, b: EventView) => a.event.startsAt.localeCompare(b.event.startsAt);
export const byScore = (a: EventView, b: EventView) => b.score.score - a.score.score || byTime(a, b);

export function instrumentIndex(snapshot: Snapshot): Map<string, Instrument> {
  return new Map(snapshot.instruments.map((i) => [i.id, i]));
}

export function targetLabel(link: EventLink, instruments: Map<string, Instrument>): string {
  return link.target.kind === "sector"
    ? link.target.sector
    : (instruments.get(link.target.instrumentId)?.displayName ?? link.target.instrumentId);
}
