"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Instrument, Snapshot } from "@/lib/domain/types";
import { useLedger, type Ledger } from "@/lib/ledger/store";
import { buildEventViews, instrumentIndex, type EventView } from "@/lib/view-model";

interface AppData {
  snapshot: Snapshot;
  /** Every event, resolved against the portfolio and scored. */
  views: EventView[];
  instruments: Map<string, Instrument>;
  ledger: Ledger;
}

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ snapshot, children }: { snapshot: Snapshot; children: ReactNode }) {
  const ledger = useLedger(snapshot.seedNotes);
  const views = useMemo(() => buildEventViews(snapshot, ledger.notes), [snapshot, ledger.notes]);
  const instruments = useMemo(() => instrumentIndex(snapshot), [snapshot]);
  return <Ctx.Provider value={{ snapshot, views, instruments, ledger }}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
