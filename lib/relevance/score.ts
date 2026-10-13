import type { EventPortfolioLink, Importance, LinkType, MarketEvent } from "../domain/types";
import { daysBetween } from "../time";

/**
 * Attention priority: a transparent ranking heuristic (0–100).
 * It is NOT a probability and NOT a prediction of price movement. It only orders events by how
 * closely they are tied to the user's own instruments. Source confidence is reported separately.
 */
export const WEIGHTS = {
  link: { DIRECT: 40, SECTOR: 22, MACRO: 12 } satisfies Record<LinkType, number>,
  held: 25,
  watchlistOnly: 10,
  proximity: [
    { withinDays: 2, points: 15 },
    { withinDays: 7, points: 10 },
    { withinDays: 30, points: 5 },
  ],
  importance: { HIGH: 12, MEDIUM: 6, LOW: 2 } satisfies Record<Importance, number>,
  saved: 8,
} as const;

export type Band = "HIGH" | "MEDIUM" | "LOW" | "NOT_LINKED";

export interface ScoreFactor {
  label: string;
  points: number;
}

export interface RelevanceScore {
  score: number;
  band: Band;
  factors: ScoreFactor[];
}

const LINK_LABEL: Record<LinkType, string> = {
  DIRECT: "Direct issuer link",
  SECTOR: "Sector relationship",
  MACRO: "Possible macro transmission channel",
};

export function bandFor(score: number): Band {
  if (score <= 0) return "NOT_LINKED";
  if (score >= 70) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export function scoreEvent(
  event: MarketEvent,
  portfolioLinks: EventPortfolioLink[],
  opts: { now: string; saved?: boolean },
): RelevanceScore {
  // No traceable relationship to the user's instruments: nothing else can make it relevant.
  if (portfolioLinks.length === 0) return { score: 0, band: "NOT_LINKED", factors: [] };

  const factors: ScoreFactor[] = [];
  const strongest = portfolioLinks.reduce((best, l) =>
    WEIGHTS.link[l.linkType] > WEIGHTS.link[best.linkType] ? l : best,
  );
  factors.push({ label: LINK_LABEL[strongest.linkType], points: WEIGHTS.link[strongest.linkType] });

  if (portfolioLinks.some((l) => l.relation === "HELD"))
    factors.push({ label: "Reaches an instrument you hold", points: WEIGHTS.held });
  else factors.push({ label: "Reaches your watchlist only", points: WEIGHTS.watchlistOnly });

  const days = daysBetween(opts.now, event.startsAt);
  const near = days >= 0 ? WEIGHTS.proximity.find((p) => days <= p.withinDays) : undefined;
  if (near) factors.push({ label: `Within ${near.withinDays} days`, points: near.points });

  factors.push({
    label: `Source-stated importance: ${event.importance.toLowerCase()}`,
    points: WEIGHTS.importance[event.importance],
  });
  if (opts.saved) factors.push({ label: "Saved to your Event Ledger", points: WEIGHTS.saved });

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  return { score, band: bandFor(score), factors };
}
