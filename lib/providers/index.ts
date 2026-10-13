import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { demoClock } from "../../data/demo-clock";
import { demoSeedNotes } from "../../data/demo-events";
import type { Snapshot } from "../domain/types";
import { demoProvider } from "./demo";
import { dhanConfigFromEnv, fetchDhanPortfolio, portfolioWithFallback, type LiveCache } from "./dhan";

// Last successful live read, held in server memory only (never persisted, never sent as raw data).
const liveCache: LiveCache = {};

/** Loads everything a screen needs. Deduplicated per request; always evaluated at request time. */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  await connection();
  const now = new Date();
  const clock = demoClock(now);
  const demo = demoProvider(clock);

  const demoPortfolio = await demo.getPortfolio();
  const config = dhanConfigFromEnv(process.env);
  const portfolio =
    config === null
      ? demoPortfolio
      : "problem" in config
        ? { ...demoPortfolio, state: { ...demoPortfolio.state, status: "unauthenticated" as const, message: `${config.problem} Showing demo data instead.` } }
        : await portfolioWithFallback((at) => fetchDhanPortfolio(config, at), demoPortfolio, liveCache, now);

  // Events, links, outcomes and the sector taxonomy are demo fixtures in every mode.
  const [{ events, links }, outcomes, instruments] = await Promise.all([
    demo.listEvents(),
    demo.getOutcomeData(),
    demo.listInstruments(),
  ]);

  return {
    generatedAt: clock.now,
    portfolio: portfolio.state,
    positions: portfolio.positions,
    watchlist: portfolio.watchlist,
    instruments,
    events,
    links,
    outcomes,
    seedNotes: demoSeedNotes(clock),
  };
});
