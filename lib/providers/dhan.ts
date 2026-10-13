import { z } from "zod";
import type { PortfolioPosition, ProviderStatus } from "../domain/types";
import type { PortfolioResult } from "./contracts";

/**
 * Read-only DhanHQ v2 adapter. It calls exactly two documented endpoints:
 *   GET  /holdings          (https://dhanhq.co/docs/v2/portfolio/)
 *   POST /marketfeed/ltp    (https://dhanhq.co/docs/v2/market-quote/) — a read, despite the verb
 * No order, funds or trade endpoint is referenced anywhere in this codebase.
 * Server-side only: the access token must never reach a client component, a log or an error message.
 */

export interface DhanConfig {
  baseUrl: string;
  clientId: string;
  accessToken: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
}

export type DhanFailure = "unauthenticated" | "not_entitled" | "rate_limited" | "unavailable" | "invalid_response";

export class DhanError extends Error {
  constructor(
    readonly kind: DhanFailure,
    message: string,
    readonly code = "",
  ) {
    super(message);
    this.name = "DhanError";
  }
}

// Codes from https://dhanhq.co/docs/v2/annexure/ (trading "DH-9xx" and data "8xx").
const AUTH_CODES = new Set(["DH-901", "807", "808", "809", "810"]);
const ENTITLEMENT_CODES = new Set(["DH-902", "806"]);
const RATE_CODES = new Set(["DH-904", "805"]);
// Observed on a live account: an account with no holdings answers HTTP 500 with this code, not an empty array.
const NO_HOLDINGS_CODE = "DH-1111";

const holdingSchema = z.object({
  exchange: z.string(),
  tradingSymbol: z.string().min(1),
  securityId: z.string().min(1),
  totalQty: z.number(),
  avgCostPrice: z.number().nonnegative(),
});
const holdingsSchema = z.array(holdingSchema);
const ltpSchema = z.object({
  data: z.record(z.string(), z.record(z.string(), z.object({ last_price: z.number().positive() }))),
});

const errorCodeOf = (body: unknown) => z.object({ errorCode: z.coerce.string() }).safeParse(body).data?.errorCode ?? "";

function classify(status: number, code: string): DhanFailure {
  if (status === 401 || status === 403 || AUTH_CODES.has(code)) return "unauthenticated";
  if (ENTITLEMENT_CODES.has(code)) return "not_entitled";
  if (status === 429 || RATE_CODES.has(code)) return "rate_limited";
  return "unavailable";
}

// Messages are fixed strings: nothing from the request (token, client id) or raw response is echoed.
const MESSAGE: Record<DhanFailure, string> = {
  unauthenticated: "DhanHQ rejected the credentials. Access tokens expire after 24 hours.",
  not_entitled: "This account is not subscribed to the requested DhanHQ API.",
  rate_limited: "DhanHQ rate limit reached. Try again shortly.",
  unavailable: "DhanHQ could not be reached or returned an error.",
  invalid_response: "DhanHQ returned data in an unexpected shape.",
};

async function request(config: DhanConfig, path: string, body?: unknown): Promise<unknown> {
  const doFetch = config.fetch ?? fetch;
  // One retry, only for network failures and 5xx. Never for 4xx or rate limits.
  for (let attempt = 0; ; attempt++) {
    let failure: DhanFailure;
    try {
      const response = await doFetch(`${config.baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "access-token": config.accessToken,
          "client-id": config.clientId,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(config.timeoutMs ?? 8000),
      });
      const json: unknown = await response.json().catch(() => undefined);
      if (response.ok) {
        if (json === undefined) throw new DhanError("invalid_response", MESSAGE.invalid_response);
        return json;
      }
      const code = errorCodeOf(json);
      failure = classify(response.status, code);
      if (response.status < 500 || failure !== "unavailable" || code === NO_HOLDINGS_CODE)
        throw new DhanError(failure, MESSAGE[failure], code);
    } catch (error) {
      if (error instanceof DhanError) throw error;
      failure = "unavailable"; // network error or timeout
    }
    if (attempt >= 1) throw new DhanError(failure, MESSAGE[failure]);
    await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs ?? 600));
  }
}

export interface LivePortfolio {
  positions: PortfolioPosition[];
  status: Extract<ProviderStatus, "live" | "partial">;
  message?: string;
}

export async function fetchDhanPortfolio(config: DhanConfig, now: string): Promise<LivePortfolio> {
  const raw = await request(config, "/holdings").catch((error: unknown) => {
    if (error instanceof DhanError && error.code === NO_HOLDINGS_CODE) return [];
    throw error;
  });
  const parsed = holdingsSchema.safeParse(raw);
  if (!parsed.success) throw new DhanError("invalid_response", MESSAGE.invalid_response);
  const holdings = parsed.data.filter((h) => h.totalQty > 0);

  // ponytail: holdings report exchange "ALL" for dual-listed stocks, so LTP is requested on NSE_EQ
  // unless the holding is BSE-only. Unverified against a live account; a miss degrades to cost basis.
  const segmentOf = (exchange: string) => (exchange === "BSE" ? "BSE_EQ" : "NSE_EQ");
  const prices = new Map<string, number>();
  let message: string | undefined;
  if (holdings.length > 0) {
    const bySegment: Record<string, number[]> = {};
    for (const h of holdings) {
      const id = Number(h.securityId);
      if (Number.isInteger(id)) (bySegment[segmentOf(h.exchange)] ??= []).push(id);
    }
    try {
      const ltp = ltpSchema.safeParse(await request(config, "/marketfeed/ltp", bySegment));
      if (!ltp.success) throw new DhanError("invalid_response", MESSAGE.invalid_response);
      for (const quotes of Object.values(ltp.data.data))
        for (const [securityId, quote] of Object.entries(quotes)) prices.set(securityId, quote.last_price);
    } catch (error) {
      if (!(error instanceof DhanError)) throw error;
      // Holdings are still real; only the prices are missing. Auth failures are not downgraded.
      if (error.kind === "unauthenticated") throw error;
      message = `Last prices unavailable: ${error.message}`;
    }
  }

  const positions = holdings.map(
    (h): PortfolioPosition => ({
      instrumentId: h.tradingSymbol,
      symbol: h.tradingSymbol,
      quantity: h.totalQty,
      averagePrice: h.avgCostPrice,
      lastPrice: prices.get(h.securityId),
      dataSource: "DhanHQ v2 holdings (read-only)",
      asOf: now,
      isIllustrative: false,
    }),
  );
  const complete = positions.every((p) => p.lastPrice !== undefined);
  return {
    positions,
    status: complete ? "live" : "partial",
    message: complete ? undefined : (message ?? "Some last prices were not returned; those positions use average cost."),
  };
}

export interface LiveCache {
  lastGood?: { fetchedAt: number; result: PortfolioResult };
}

/** Reuse a successful read for this long, so page navigations stay well inside Dhan's rate limits. */
export const LIVE_TTL_MS = 30_000;

/**
 * Live portfolio with honest degradation:
 *   success            → mode "dhan", status live | partial
 *   failure, had data  → mode "dhan", status stale (last good read, with its original as-of)
 *   failure, no data   → mode "demo", status unauthenticated | unavailable, with the reason shown
 * The visible mode always matches what the positions actually are.
 */
export async function portfolioWithFallback(
  fetchLive: (now: string) => Promise<LivePortfolio>,
  demo: PortfolioResult,
  cache: LiveCache,
  now: Date,
): Promise<PortfolioResult> {
  const { lastGood } = cache;
  if (lastGood && now.getTime() - lastGood.fetchedAt < LIVE_TTL_MS) return lastGood.result;

  const heldIds = (positions: PortfolioPosition[]) => new Set(positions.map((p) => p.instrumentId));
  try {
    const nowIso = now.toISOString();
    const live = await fetchLive(nowIso);
    const held = heldIds(live.positions);
    const result: PortfolioResult = {
      state: { mode: "dhan", status: live.status, asOf: nowIso, lastSuccessfulSync: nowIso, message: live.message },
      positions: live.positions,
      // DhanHQ has no watchlist API in this adapter; the demo watchlist stays, minus anything now held.
      watchlist: demo.watchlist.filter((w) => !held.has(w.instrumentId)),
    };
    cache.lastGood = { fetchedAt: now.getTime(), result };
    return result;
  } catch (error) {
    const reason = error instanceof DhanError ? error.message : MESSAGE.unavailable;
    if (lastGood)
      return { ...lastGood.result, state: { ...lastGood.result.state, status: "stale", message: `${reason} Showing the last successful read.` } };
    const status: ProviderStatus = error instanceof DhanError && error.kind === "unauthenticated" ? "unauthenticated" : "unavailable";
    return { ...demo, state: { ...demo.state, status, message: `${reason} Showing demo data instead.` } };
  }
}

/** Reads server-side environment configuration. Returns null when the integration is switched off. */
export function dhanConfigFromEnv(env: Record<string, string | undefined>): DhanConfig | { problem: string } | null {
  if (env.DHAN_READ_ONLY_ENABLED !== "true") return null;
  const clientId = env.DHAN_CLIENT_ID?.trim();
  const accessToken = env.DHAN_ACCESS_TOKEN?.trim();
  if (!clientId || !accessToken)
    return { problem: "DHAN_READ_ONLY_ENABLED is true but DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN is not set." };
  const baseUrl = (env.DHAN_API_BASE_URL?.trim() || "https://api.dhan.co/v2").replace(/\/+$/, "");
  // The token is sent to this host, so refuse anything that is not HTTPS.
  if (!URL.canParse(baseUrl) || new URL(baseUrl).protocol !== "https:")
    return { problem: "DHAN_API_BASE_URL must be an https URL." };
  return { baseUrl, clientId, accessToken };
}
