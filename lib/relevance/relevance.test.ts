import { describe, expect, it } from "vitest";
import type { EventLink, Instrument, LinkType, MarketEvent, PortfolioPosition } from "../domain/types";
import { portfolioValue, resolveEvent, type PortfolioContext } from "./links";
import { bandFor, scoreEvent, WEIGHTS } from "./score";

const NOW = "2026-10-13T10:00:00+05:30";

const instrument = (id: string, sector: string): Instrument => ({
  id,
  symbol: id,
  displayName: id,
  exchange: "NSE",
  sector,
  metadataSource: "test",
  metadataUpdatedAt: NOW,
});

const position = (id: string, quantity: number, averagePrice: number, lastPrice?: number): PortfolioPosition => ({
  instrumentId: id,
  symbol: id,
  quantity,
  averagePrice,
  lastPrice,
  dataSource: "test",
  asOf: NOW,
  isIllustrative: true,
});

const link = (linkType: LinkType, target: EventLink["target"], id = `${linkType}-${JSON.stringify(target)}`): EventLink => ({
  id,
  eventId: "e1",
  target,
  linkType,
  channel: "c",
  rationale: "r",
  rule: "rule",
  evidence: [],
  confidence: "CURATED",
  isHumanCurated: true,
});

const ctx: PortfolioContext = {
  instruments: [instrument("BANKA", "Banks"), instrument("BANKB", "Banks"), instrument("ITA", "IT"), instrument("ITB", "IT")],
  positions: [position("BANKA", 10, 100, 150), position("ITA", 5, 200)],
  watchlist: [{ instrumentId: "BANKB", listName: "w", addedAt: NOW }],
  asOf: NOW,
};

const event = (startsAt: string, importance: MarketEvent["importance"] = "MEDIUM"): MarketEvent => ({
  id: "e1",
  title: "t",
  type: "EARNINGS",
  description: "",
  startsAt,
  timezone: "Asia/Kolkata",
  status: "SCHEDULED",
  importance,
  publisher: "p",
  publishedAt: NOW,
  updatedAt: NOW,
  isIllustrative: true,
  known: [],
  uncertain: [],
  suggestedWatchItems: [],
});

describe("resolveEvent", () => {
  it("resolves a direct link to a held instrument with measured exposure", () => {
    const r = resolveEvent("e1", [link("DIRECT", { kind: "instrument", instrumentId: "BANKA" })], ctx);
    expect(r.portfolioLinks).toHaveLength(1);
    const [l] = r.portfolioLinks;
    expect(l).toMatchObject({ instrumentId: "BANKA", linkType: "DIRECT", relation: "HELD" });
    // 10 × 150 market value out of 1500 + (5 × 200 at cost) = 2500
    expect(portfolioValue(ctx.positions)).toBe(2500);
    expect(l.exposure).toEqual({ value: 1500, weight: 0.6, basis: "MARKET", kind: "MEASURED" });
  });

  it("resolves a sector link through metadata to held and watchlist instruments", () => {
    const r = resolveEvent("e1", [link("SECTOR", { kind: "sector", sector: "Banks" })], ctx);
    expect(r.portfolioLinks.map((l) => [l.instrumentId, l.relation])).toEqual([
      ["BANKA", "HELD"],
      ["BANKB", "WATCHLIST"],
    ]);
    expect(r.portfolioLinks[0].exposure?.kind).toBe("INDIRECT");
  });

  it("never shows a monetary exposure for a watchlist-only instrument", () => {
    const r = resolveEvent("e1", [link("DIRECT", { kind: "instrument", instrumentId: "BANKB" })], ctx);
    expect(r.portfolioLinks[0]).toMatchObject({ relation: "WATCHLIST", exposure: undefined });
  });

  it("values a position at cost when no last price exists", () => {
    const r = resolveEvent("e1", [link("DIRECT", { kind: "instrument", instrumentId: "ITA" })], ctx);
    expect(r.portfolioLinks[0].exposure).toMatchObject({ value: 1000, basis: "COST" });
  });

  it("keeps macro links as sector-level hypotheses", () => {
    const r = resolveEvent("e1", [link("MACRO", { kind: "sector", sector: "IT" })], ctx);
    expect(r.portfolioLinks).toHaveLength(1);
    expect(r.portfolioLinks[0]).toMatchObject({ instrumentId: "ITA", linkType: "MACRO" });
    expect(r.portfolioLinks[0].exposure?.kind).toBe("INDIRECT");
  });

  it("rejects a macro link aimed directly at an instrument", () => {
    const r = resolveEvent("e1", [link("MACRO", { kind: "instrument", instrumentId: "BANKA" })], ctx);
    expect(r.portfolioLinks).toHaveLength(0);
    expect(r.rejected[0].reason).toMatch(/must target a sector/);
  });

  it("rejects a direct link with no verified instrument mapping", () => {
    const r = resolveEvent("e1", [link("DIRECT", { kind: "instrument", instrumentId: "UNKNOWN" })], ctx);
    expect(r.links).toHaveLength(0);
    expect(r.rejected[0].reason).toMatch(/No verified instrument mapping/);
  });

  it("links nothing for a sector with no instruments in the portfolio", () => {
    const r = resolveEvent("e1", [link("SECTOR", { kind: "sector", sector: "Telecom" })], ctx);
    expect(r.links).toHaveLength(1);
    expect(r.portfolioLinks).toHaveLength(0);
  });

  it("collapses an instrument reached twice onto its strongest link", () => {
    const direct = link("DIRECT", { kind: "instrument", instrumentId: "BANKA" }, "d");
    const sector = link("SECTOR", { kind: "sector", sector: "Banks" }, "s");
    const r = resolveEvent("e1", [sector, direct], ctx);
    const banka = r.portfolioLinks.filter((l) => l.instrumentId === "BANKA");
    expect(banka).toHaveLength(1);
    expect(banka[0]).toMatchObject({ linkId: "d", linkType: "DIRECT", alsoViaLinkIds: ["s"] });
  });

  it("counts an identical relationship supplied twice only once", () => {
    const a = link("SECTOR", { kind: "sector", sector: "Banks" }, "a");
    const b = link("SECTOR", { kind: "sector", sector: "Banks" }, "b");
    const r = resolveEvent("e1", [a, b], ctx);
    expect(r.links.map((l) => l.id)).toEqual(["a"]);
    expect(r.portfolioLinks[0].alsoViaLinkIds).toEqual([]);
  });

  it("ignores links that belong to other events", () => {
    const other = { ...link("DIRECT", { kind: "instrument", instrumentId: "BANKA" }), eventId: "e2" };
    expect(resolveEvent("e1", [other], ctx).links).toHaveLength(0);
  });
});

describe("scoreEvent", () => {
  const resolved = (l: EventLink) => resolveEvent("e1", [l], ctx).portfolioLinks;
  const inDays = (n: number) => new Date(Date.parse(NOW) + n * 86_400_000).toISOString();

  it("scores zero when nothing links to the portfolio", () => {
    expect(scoreEvent(event(inDays(1), "HIGH"), [], { now: NOW })).toEqual({ score: 0, band: "NOT_LINKED", factors: [] });
  });

  it("sums inspectable factors for a direct, held, near, high-importance event", () => {
    const s = scoreEvent(event(inDays(1), "HIGH"), resolved(link("DIRECT", { kind: "instrument", instrumentId: "BANKA" })), { now: NOW });
    expect(s.score).toBe(WEIGHTS.link.DIRECT + WEIGHTS.held + 15 + WEIGHTS.importance.HIGH);
    expect(s.factors.reduce((a, f) => a + f.points, 0)).toBe(s.score);
    expect(s.band).toBe("HIGH");
  });

  it("ranks direct above sector above macro, all else equal", () => {
    const at = event(inDays(5));
    const direct = scoreEvent(at, resolved(link("DIRECT", { kind: "instrument", instrumentId: "ITA" })), { now: NOW });
    const sector = scoreEvent(at, resolved(link("SECTOR", { kind: "sector", sector: "IT" })), { now: NOW });
    const macro = scoreEvent(at, resolved(link("MACRO", { kind: "sector", sector: "IT" })), { now: NOW });
    expect(direct.score).toBeGreaterThan(sector.score);
    expect(sector.score).toBeGreaterThan(macro.score);
  });

  it("ranks a held instrument above a watchlist-only one", () => {
    const at = event(inDays(5));
    const held = scoreEvent(at, resolved(link("DIRECT", { kind: "instrument", instrumentId: "BANKA" })), { now: NOW });
    const watch = scoreEvent(at, resolved(link("DIRECT", { kind: "instrument", instrumentId: "BANKB" })), { now: NOW });
    expect(held.score - watch.score).toBe(WEIGHTS.held - WEIGHTS.watchlistOnly);
  });

  it("gives no proximity points to past or distant events", () => {
    const links = resolved(link("DIRECT", { kind: "instrument", instrumentId: "BANKA" }));
    const labels = (at: string) => scoreEvent(event(at), links, { now: NOW }).factors.map((f) => f.label);
    expect(labels(inDays(-2)).some((l) => l.startsWith("Within"))).toBe(false);
    expect(labels(inDays(60)).some((l) => l.startsWith("Within"))).toBe(false);
    expect(labels(inDays(6))).toContain("Within 7 days");
  });

  it("adds the saved boost and never exceeds 100", () => {
    const links = resolved(link("DIRECT", { kind: "instrument", instrumentId: "BANKA" }));
    const base = scoreEvent(event(inDays(1), "HIGH"), links, { now: NOW });
    const saved = scoreEvent(event(inDays(1), "HIGH"), links, { now: NOW, saved: true });
    expect(saved.score).toBe(Math.min(100, base.score + WEIGHTS.saved));
    expect(saved.score).toBeLessThanOrEqual(100);
  });

  it("maps scores to bands", () => {
    expect([0, 30, 45, 69, 70].map(bandFor)).toEqual(["NOT_LINKED", "LOW", "MEDIUM", "MEDIUM", "HIGH"]);
  });
});
