import { describe, expect, it, vi } from "vitest";
import type { PortfolioResult } from "./contracts";
import { DhanError, dhanConfigFromEnv, fetchDhanPortfolio, LIVE_TTL_MS, portfolioWithFallback, type DhanConfig, type LiveCache } from "./dhan";

const TOKEN = "secret-token-value";
const NOW = "2026-10-13T10:00:00.000Z";

const HOLDINGS = [
  { exchange: "ALL", tradingSymbol: "TCS", securityId: "11536", isin: "X", totalQty: 10, dpQty: 10, t1Qty: 0, availableQty: 10, collateralQty: 0, avgCostPrice: 3000 },
  { exchange: "BSE", tradingSymbol: "BSEONLY", securityId: "500001", isin: "Y", totalQty: 5, dpQty: 5, t1Qty: 0, availableQty: 5, collateralQty: 0, avgCostPrice: 100 },
  { exchange: "NSE", tradingSymbol: "SOLD", securityId: "42", isin: "Z", totalQty: 0, dpQty: 0, t1Qty: 0, availableQty: 0, collateralQty: 0, avgCostPrice: 50 },
];
const LTP = { status: "success", data: { NSE_EQ: { "11536": { last_price: 3500 } }, BSE_EQ: { "500001": { last_price: 120 } } } };

type Reply = { status: number; body: unknown } | Error;

function setup(replies: Record<string, Reply[]>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- typed so tests can inspect the init
  const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const path = String(url).replace("https://api.test/v2", "");
    const reply = replies[path]?.shift();
    if (!reply) throw new Error(`unexpected request to ${path}`);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  const config: DhanConfig = { baseUrl: "https://api.test/v2", clientId: "1000000001", accessToken: TOKEN, fetch: fetchMock, retryDelayMs: 0 };
  return { config, fetchMock };
}

const demo: PortfolioResult = {
  state: { mode: "demo", status: "demo", asOf: NOW },
  positions: [{ instrumentId: "DEMO", symbol: "DEMO", quantity: 1, averagePrice: 1, dataSource: "demo", asOf: NOW, isIllustrative: true }],
  watchlist: [
    { instrumentId: "TCS", listName: "w", addedAt: NOW },
    { instrumentId: "INFY", listName: "w", addedAt: NOW },
  ],
};

describe("fetchDhanPortfolio", () => {
  it("maps holdings and last prices, sending credentials only as headers", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 200, body: HOLDINGS }], "/marketfeed/ltp": [{ status: 200, body: LTP }] });
    const live = await fetchDhanPortfolio(config, NOW);

    expect(live.status).toBe("live");
    expect(live.positions).toEqual([
      expect.objectContaining({ instrumentId: "TCS", quantity: 10, averagePrice: 3000, lastPrice: 3500, isIllustrative: false }),
      expect.objectContaining({ instrumentId: "BSEONLY", lastPrice: 120 }),
    ]);

    const calls = fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), init }));
    expect(calls.map((c) => `${c.init?.method} ${c.url}`)).toEqual(["GET https://api.test/v2/holdings", "POST https://api.test/v2/marketfeed/ltp"]);
    expect(calls.every((c) => !c.url.includes(TOKEN))).toBe(true);
    expect(calls[0].init?.headers).toMatchObject({ "access-token": TOKEN, "client-id": "1000000001" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ NSE_EQ: [11536], BSE_EQ: [500001] });
  });

  it("only ever calls the two read endpoints", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 200, body: HOLDINGS }], "/marketfeed/ltp": [{ status: 200, body: LTP }] });
    await fetchDhanPortfolio(config, NOW);
    for (const [url] of fetchMock.mock.calls) expect(String(url)).toMatch(/\/(holdings|marketfeed\/ltp)$/);
  });

  it("degrades to partial at cost basis when the Data API is not subscribed", async () => {
    const { config } = setup({ "/holdings": [{ status: 200, body: HOLDINGS }], "/marketfeed/ltp": [{ status: 400, body: { errorCode: "806" } }] });
    const live = await fetchDhanPortfolio(config, NOW);
    expect(live.status).toBe("partial");
    expect(live.positions.every((p) => p.lastPrice === undefined)).toBe(true);
    expect(live.message).toMatch(/Last prices unavailable/);
  });

  it("is partial when a single price is missing", async () => {
    const body = { data: { NSE_EQ: { "11536": { last_price: 3500 } } } };
    const { config } = setup({ "/holdings": [{ status: 200, body: HOLDINGS }], "/marketfeed/ltp": [{ status: 200, body }] });
    expect((await fetchDhanPortfolio(config, NOW)).status).toBe("partial");
  });

  it("skips the price request for an empty account", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 200, body: [] }] });
    expect(await fetchDhanPortfolio(config, NOW)).toMatchObject({ positions: [], status: "live" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads Dhan's 'no holdings' error as an empty account, without retrying", async () => {
    const body = { errorType: "HOLDING_ERROR", errorCode: "DH-1111", errorMessage: "No holdings available" };
    const { config, fetchMock } = setup({ "/holdings": [{ status: 500, body }] });
    expect(await fetchDhanPortfolio(config, NOW)).toMatchObject({ positions: [], status: "live" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an expired token without retrying or leaking it", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 401, body: { errorCode: "DH-901", errorMessage: `bad ${TOKEN}` } }] });
    const error = await fetchDhanPortfolio(config, NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DhanError);
    expect((error as DhanError).kind).toBe("unauthenticated");
    expect((error as DhanError).message).not.toContain(TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a rate-limit response", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 429, body: { errorCode: "DH-904" } }] });
    await expect(fetchDhanPortfolio(config, NOW)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a server error once, then succeeds", async () => {
    const { config, fetchMock } = setup({ "/holdings": [{ status: 503, body: {} }, { status: 200, body: [] }] });
    expect((await fetchDhanPortfolio(config, NOW)).status).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry on network failure", async () => {
    const { config, fetchMock } = setup({ "/holdings": [new Error(`connect failed ${TOKEN}`), new Error("again")] });
    const error = (await fetchDhanPortfolio(config, NOW).catch((e: unknown) => e)) as DhanError;
    expect(error.kind).toBe("unavailable");
    expect(error.message).not.toContain(TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a malformed holdings payload", async () => {
    const { config } = setup({ "/holdings": [{ status: 200, body: [{ tradingSymbol: "TCS", totalQty: "ten" }] }] });
    await expect(fetchDhanPortfolio(config, NOW)).rejects.toMatchObject({ kind: "invalid_response" });
  });
});

describe("portfolioWithFallback", () => {
  const live = { positions: [{ ...demo.positions[0], instrumentId: "TCS", symbol: "TCS", isIllustrative: false }], status: "live" as const };
  const at = (ms: number) => new Date(Date.parse(NOW) + ms);

  it("shows Dhan mode on success and drops held instruments from the watchlist", async () => {
    const result = await portfolioWithFallback(async () => live, demo, {}, at(0));
    expect(result.state).toMatchObject({ mode: "dhan", status: "live", lastSuccessfulSync: NOW });
    expect(result.watchlist.map((w) => w.instrumentId)).toEqual(["INFY"]);
  });

  it("falls back to demo mode, visibly, when the token is rejected", async () => {
    const fail = async () => {
      throw new DhanError("unauthenticated", "DhanHQ rejected the credentials.");
    };
    const result = await portfolioWithFallback(fail, demo, {}, at(0));
    expect(result.state).toMatchObject({ mode: "demo", status: "unauthenticated" });
    expect(result.state.message).toMatch(/Showing demo data instead/);
    expect(result.positions).toBe(demo.positions);
  });

  it("falls back to demo mode as unavailable on any other failure", async () => {
    const result = await portfolioWithFallback(async () => Promise.reject(new Error("boom")), demo, {}, at(0));
    expect(result.state).toMatchObject({ mode: "demo", status: "unavailable" });
  });

  it("reuses a fresh read, then serves it as stale when a later read fails", async () => {
    const cache: LiveCache = {};
    const fetchLive = vi.fn(async () => live);
    await portfolioWithFallback(fetchLive, demo, cache, at(0));
    await portfolioWithFallback(fetchLive, demo, cache, at(LIVE_TTL_MS - 1));
    expect(fetchLive).toHaveBeenCalledTimes(1);

    const stale = await portfolioWithFallback(async () => Promise.reject(new DhanError("unavailable", "Down.")), demo, cache, at(LIVE_TTL_MS + 1));
    expect(stale.state).toMatchObject({ mode: "dhan", status: "stale", asOf: NOW });
    expect(stale.positions).toEqual(live.positions);
  });
});

describe("dhanConfigFromEnv", () => {
  it("is off unless explicitly enabled", () => {
    expect(dhanConfigFromEnv({})).toBeNull();
    expect(dhanConfigFromEnv({ DHAN_READ_ONLY_ENABLED: "false", DHAN_ACCESS_TOKEN: "t", DHAN_CLIENT_ID: "c" })).toBeNull();
  });
  it("reports missing credentials without throwing", () => {
    expect(dhanConfigFromEnv({ DHAN_READ_ONLY_ENABLED: "true" })).toHaveProperty("problem");
  });
  it("refuses a non-https base URL", () => {
    const env = { DHAN_READ_ONLY_ENABLED: "true", DHAN_ACCESS_TOKEN: "t", DHAN_CLIENT_ID: "c" };
    expect(dhanConfigFromEnv({ ...env, DHAN_API_BASE_URL: "http://api.dhan.co/v2" })).toHaveProperty("problem");
    expect(dhanConfigFromEnv({ ...env, DHAN_API_BASE_URL: "https://api.dhan.co/v2/" })).toMatchObject({ baseUrl: "https://api.dhan.co/v2" });
    expect(dhanConfigFromEnv(env)).toMatchObject({ baseUrl: "https://api.dhan.co/v2" });
  });
});
