import { describe, expect, it } from "vitest";
import type { PriceSeries } from "../domain/types";
import { aggregate, findWindow, observe, relativeReturn, simpleReturn } from "./returns";

const series = (id: string, bars: [string, number][], extra: Partial<PriceSeries> = {}): PriceSeries => ({
  instrumentId: id,
  label: id,
  bars: bars.map(([date, close]) => ({ date, close })),
  source: "test",
  asOf: "2026-10-09T15:30:00+05:30",
  isSimulated: true,
  adjusted: true,
  ...extra,
});

// Mon 5 Oct … Fri 9 Oct 2026
const stock = series("S", [["2026-10-05", 100], ["2026-10-06", 100], ["2026-10-07", 110], ["2026-10-08", 99]]);
const bench = series("B", [["2026-10-05", 1000], ["2026-10-06", 1000], ["2026-10-07", 1020], ["2026-10-08", 1000]]);
const DURING_HOURS = "2026-10-07T13:30:00+05:30";
const AFTER_HOURS = "2026-10-07T16:30:00+05:30";

describe("simpleReturn", () => {
  it("handles positive, negative and zero movement", () => {
    expect(simpleReturn(100, 110)).toBeCloseTo(10);
    expect(simpleReturn(100, 90)).toBeCloseTo(-10);
    expect(simpleReturn(100, 100)).toBe(0);
  });

  it("returns null for invalid prices", () => {
    expect(simpleReturn(0, 100)).toBeNull();
    expect(simpleReturn(-5, 100)).toBeNull();
    expect(simpleReturn(Number.NaN, 100)).toBeNull();
    expect(simpleReturn(100, Number.POSITIVE_INFINITY)).toBeNull();
    expect(simpleReturn(100, -1)).toBeNull();
  });
});

describe("relativeReturn", () => {
  it("is a difference in percentage points, not a ratio", () => {
    expect(relativeReturn(10, 2)).toBe(8);
    expect(relativeReturn(-3, 2)).toBe(-5);
  });
});

describe("findWindow", () => {
  it("uses prior close to event-day close for a release during market hours", () => {
    expect(findWindow(stock.bars, DURING_HOURS, "FIRST_CLOSE")).toEqual({
      start: { date: "2026-10-06", close: 100 },
      end: { date: "2026-10-07", close: 110 },
    });
  });

  it("uses event-day close to next close for a release after market hours", () => {
    expect(findWindow(stock.bars, AFTER_HOURS, "FIRST_CLOSE")).toEqual({
      start: { date: "2026-10-07", close: 110 },
      end: { date: "2026-10-08", close: 99 },
    });
  });

  it("extends to the following close for NEXT_CLOSE", () => {
    expect(findWindow(stock.bars, DURING_HOURS, "NEXT_CLOSE")?.end.date).toBe("2026-10-08");
  });

  it("returns null without a prior close, a later close, or a valid time", () => {
    expect(findWindow(stock.bars, "2026-10-05T10:00:00+05:30", "FIRST_CLOSE")).toBeNull();
    expect(findWindow(stock.bars, "2026-10-09T10:00:00+05:30", "FIRST_CLOSE")).toBeNull();
    expect(findWindow(stock.bars, AFTER_HOURS, "NEXT_CLOSE")).toBeNull();
    expect(findWindow([], DURING_HOURS, "FIRST_CLOSE")).toBeNull();
    expect(findWindow(stock.bars, "not a date", "FIRST_CLOSE")).toBeNull();
  });
});

describe("observe", () => {
  it("computes absolute, benchmark and relative return over one matching window", () => {
    const o = observe(stock, bench, DURING_HOURS, "FIRST_CLOSE");
    expect(o).toMatchObject({ startDate: "2026-10-06", endDate: "2026-10-07", startPrice: 100, endPrice: 110 });
    expect(o?.absoluteReturn).toBeCloseTo(10);
    expect(o?.benchmarkReturn).toBeCloseTo(2);
    expect(o?.relativeReturn).toBeCloseTo(8);
    expect(o?.limitation).toBeUndefined();
    expect(o?.isSimulated).toBe(true);
  });

  it("refuses a relative return when the benchmark window differs", () => {
    const gappy = series("B", [["2026-10-05", 1000], ["2026-10-07", 1020]]);
    const o = observe(stock, gappy, DURING_HOURS, "FIRST_CLOSE");
    expect(o?.absoluteReturn).toBeCloseTo(10);
    expect(o?.benchmarkReturn).toBeNull();
    expect(o?.relativeReturn).toBeNull();
    expect(o?.limitation).toMatch(/does not match/);
  });

  it("refuses a relative return when the benchmark is absent", () => {
    const o = observe(stock, undefined, DURING_HOURS, "FIRST_CLOSE");
    expect(o?.relativeReturn).toBeNull();
    expect(o?.limitation).toMatch(/No benchmark data/);
  });

  it("returns null when the instrument has no usable window or prices", () => {
    expect(observe(series("S", []), bench, DURING_HOURS, "FIRST_CLOSE")).toBeNull();
    expect(observe(series("S", [["2026-10-06", 0], ["2026-10-07", 10]]), bench, DURING_HOURS, "FIRST_CLOSE")).toBeNull();
  });

  it("flags unadjusted closes as a limitation", () => {
    const o = observe({ ...stock, adjusted: false }, bench, DURING_HOURS, "FIRST_CLOSE");
    expect(o?.limitation).toMatch(/Unadjusted/);
  });
});

describe("aggregate", () => {
  it("is an equal-weighted mean and drops relative when any row lacks it", () => {
    const a = observe(stock, bench, DURING_HOURS, "FIRST_CLOSE")!;
    const b = observe(series("T", [["2026-10-06", 100], ["2026-10-07", 104]]), bench, DURING_HOURS, "FIRST_CLOSE")!;
    expect(aggregate([a, b])?.absolute).toBeCloseTo(7);
    expect(aggregate([a, b])?.relative).toBeCloseTo(5);
    expect(aggregate([a, { ...b, relativeReturn: null }])?.relative).toBeNull();
    expect(aggregate([])).toBeNull();
  });
});
