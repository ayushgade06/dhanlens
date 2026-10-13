import { cache } from "react";
import { connection } from "next/server";
import { demoClock } from "../../data/demo-clock";
import { demoSeedNotes } from "../../data/demo-events";
import type { Snapshot } from "../domain/types";
import { demoProvider } from "./demo";

/** Loads everything a screen needs. Deduplicated per request; always evaluated at request time. */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  await connection();
  const clock = demoClock(new Date());
  const demo = demoProvider(clock);

  const [portfolio, { events, links }, outcomes, instruments] = await Promise.all([
    demo.getPortfolio(),
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
