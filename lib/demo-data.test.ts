import { describe, expect, it } from "vitest";
import { demoClock } from "../data/demo-clock";
import { demoEvents, demoLinks, demoSeedNotes } from "../data/demo-events";
import { demoInstruments } from "../data/demo-instruments";
import { demoOutcomes } from "../data/demo-outcomes";
import { demoPositions, demoWatchlist } from "../data/demo-portfolio";
import type { Snapshot } from "./domain/types";
import { lifecycleOf } from "./ledger/lifecycle";
import { observeOutcome } from "./outcomes/returns";
import { addBusinessDays, daysBetween, istDate } from "./time";
import { buildEventViews } from "./view-model";

// A Saturday, to prove fixtures never land on a weekend.
const clock = demoClock(new Date("2026-10-17T06:00:00Z"));
const snapshot: Snapshot = {
  generatedAt: clock.now,
  portfolio: { mode: "demo", status: "demo", asOf: clock.now },
  positions: demoPositions(clock),
  watchlist: demoWatchlist(clock),
  instruments: demoInstruments,
  events: demoEvents(clock),
  links: demoLinks(clock),
  outcomes: demoOutcomes(clock),
  seedNotes: demoSeedNotes(clock),
};
const views = buildEventViews(snapshot, {});
const view = (id: string) => views.find((v) => v.event.id === id)!;

describe("time helpers", () => {
  it("reads the calendar date in IST", () => {
    expect(istDate("2026-10-13T20:00:00Z")).toBe("2026-10-14");
  });
  it("skips weekends in both directions", () => {
    expect(addBusinessDays("2026-10-16", 1)).toBe("2026-10-19");
    expect(addBusinessDays("2026-10-19", -1)).toBe("2026-10-16");
    expect(addBusinessDays("2026-10-17", 0)).toBe("2026-10-19");
  });
  it("counts whole IST days", () => {
    expect(daysBetween("2026-10-13T23:00:00+05:30", "2026-10-14T01:00:00+05:30")).toBe(1);
  });
});

describe("demo dataset", () => {
  it("marks every event, position and price series as illustrative", () => {
    expect(snapshot.events.every((e) => e.isIllustrative && e.title.startsWith("Illustrative scenario"))).toBe(true);
    expect(snapshot.events.every((e) => e.sourceUrl === undefined)).toBe(true);
    expect(snapshot.positions.every((p) => p.isIllustrative)).toBe(true);
    expect(snapshot.outcomes.flatMap((o) => [o.benchmark, ...o.series]).every((s) => s.isSimulated)).toBe(true);
  });

  it("never schedules an event on a weekend", () => {
    for (const e of snapshot.events) expect([0, 6]).not.toContain(new Date(`${e.startsAt.slice(0, 10)}T00:00:00Z`).getUTCDay());
  });

  it("has no link that breaks the linking rules", () => {
    expect(views.flatMap((v) => v.rejected)).toEqual([]);
  });

  it("spans at least four sectors and exercises every link type", () => {
    const sectors = new Set(snapshot.positions.map((p) => demoInstruments.find((i) => i.id === p.instrumentId)?.sector));
    expect(sectors.size).toBeGreaterThanOrEqual(4);
    expect(new Set(snapshot.links.map((l) => l.linkType))).toEqual(new Set(["DIRECT", "SECTOR", "MACRO"]));
  });

  it("links the highlighted event directly to a holding and by sector to the watchlist", () => {
    const v = view("evt-tcs-results");
    expect(v.portfolioLinks.map((l) => [l.instrumentId, l.linkType, l.relation])).toEqual([
      ["TCS", "DIRECT", "HELD"],
      ["INFY", "SECTOR", "WATCHLIST"],
    ]);
    expect(v.score.band).toBe("HIGH");
  });

  it("leaves an event outside the portfolio unlinked", () => {
    expect(view("evt-telecom-tariff").score.band).toBe("NOT_LINKED");
  });

  it("derives each lifecycle state from evidence", () => {
    expect(view("evt-tcs-results").lifecycle).toBe("UPCOMING");
    expect(view("evt-hdfcbank-results").lifecycle).toBe("OBSERVED");
    expect(view("evt-cpi-print").lifecycle).toBe("DATA_UNAVAILABLE");
    const reviewed = { ...snapshot.seedNotes[0], reviewedAt: clock.now };
    expect(lifecycleOf(view("evt-hdfcbank-results").event, true, reviewed)).toBe("REVIEWED");
  });

  it("produces a matching benchmark window for the completed event", () => {
    const event = view("evt-hdfcbank-results").event;
    const [hdfc] = observeOutcome(snapshot.outcomes[0], event.startsAt, "FIRST_CLOSE");
    expect(hdfc.absoluteReturn).toBeCloseTo(((1628 - 1596) / 1596) * 100);
    expect(hdfc.benchmarkReturn).toBeCloseTo(((25040 - 24980) / 24980) * 100);
    expect(hdfc.relativeReturn).toBeCloseTo(hdfc.absoluteReturn - hdfc.benchmarkReturn!);
    expect(hdfc.limitation).toBeUndefined();
  });
});
